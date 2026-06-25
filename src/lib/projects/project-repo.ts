/**
 * Projetos recebedores (grants/bounties): um projeto envia 1 UFVK uma vez; o sistema
 * registra a chave no scanner stateless e DERIVA N endereços diversificados (1 por
 * mês). O pagador usa o endereço do mês; como todos derivam da mesma IVK, a
 * auditoria vê todos os recebimentos.
 *
 * Node-less: a parte criptográfica (validar UFVK + derivar) roda no `ppf-scanner`
 * via HTTP — nada de Zebra/zallet/zkool na LAN. Custódia: o scanner guarda a UFVK
 * e devolve um `scanRef` opaco; NÃO persistimos a viewing key, só o scanRef + fingerprint.
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { derivedAddresses, projectRecipients } from "@/lib/db/schema";
import { deriveAddress, registerUfvk } from "@/lib/zcash/scanner-client";
import { openSealed } from "@/lib/onboarding/seal";

export interface CreateProjectInput {
  readonly name: string;
  readonly paymentKind: "grant" | "bounty";
  readonly sealedUfvk: string;
  readonly birthHeight?: number;
  readonly months?: number;
  readonly startMonth?: string; // YYYY-MM
}

const pad = (n: number) => String(n).padStart(2, "0");

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function monthsFrom(start: string, count: number): string[] {
  const [y, m] = start.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    out.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  }
  return out;
}

export interface DerivedAddressView {
  readonly issuedMonth: string;
  readonly address: string;
  readonly diversifierIndex: number;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<{ id: string; addresses: DerivedAddressView[] }> {
  const ufvk = (await openSealed(input.sealedUfvk)).trim();
  if (!/^(uview1|zxviews1|uivk1)/.test(ufvk))
    throw new Error("Invalid viewing key (expected uview1…/zxviews1…).");

  const name = input.name.trim() || "Project";
  // Registra a UFVK no scanner: a chave fica só lá, recebemos um scanRef opaco.
  const reg = await registerUfvk(ufvk);

  const projectId = `p-${randomUUID().slice(0, 8)}`;
  await getDb()
    .insert(projectRecipients)
    .values({
      id: projectId,
      projectName: name,
      paymentKind: input.paymentKind === "bounty" ? "bounty" : "grant",
      scanRef: reg.scanRef,
      ufvkFingerprint: reg.fingerprint,
    });

  const count = Math.max(1, Math.min(input.months ?? 12, 36));
  const months = monthsFrom(input.startMonth || currentMonth(), count);

  const addresses: DerivedAddressView[] = [];
  for (let i = 0; i < months.length; i++) {
    // Um índice de diversificador por mês → endereço novo, mesma viewing key.
    const { address, actualIndex } = await deriveAddress(reg.scanRef, i);
    await getDb()
      .insert(derivedAddresses)
      .values({
        id: `da-${randomUUID().slice(0, 8)}`,
        projectId,
        address,
        diversifierIndex: BigInt(actualIndex),
        issuedMonth: months[i],
      });
    addresses.push({
      issuedMonth: months[i],
      address,
      diversifierIndex: actualIndex,
    });
  }

  return { id: projectId, addresses };
}

export async function listProjects() {
  const db = getDb();
  const [projects, addrs] = await Promise.all([
    db.select().from(projectRecipients),
    db.select().from(derivedAddresses),
  ]);
  return projects
    .map((p) => ({
      id: p.id,
      projectName: p.projectName,
      paymentKind: p.paymentKind,
      ufvkFingerprint: p.ufvkFingerprint,
      createdAt: p.createdAt.toISOString(),
      addresses: addrs
        .filter((a) => a.projectId === p.id)
        .sort((a, b) => a.issuedMonth.localeCompare(b.issuedMonth))
        .map((a) => ({
          issuedMonth: a.issuedMonth,
          address: a.address,
          diversifierIndex: Number(a.diversifierIndex),
        })),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Mapa address → {projectId, projectName, paymentKind, issuedMonth} para reconciliação. */
export async function loadDerivedAddressIndex(): Promise<
  Map<
    string,
    {
      projectId: string;
      projectName: string;
      paymentKind: string;
      issuedMonth: string;
    }
  >
> {
  const db = getDb();
  const [projects, addrs] = await Promise.all([
    db.select().from(projectRecipients),
    db.select().from(derivedAddresses),
  ]);
  const byId = new Map(projects.map((p) => [p.id, p]));
  const out = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      paymentKind: string;
      issuedMonth: string;
    }
  >();
  for (const a of addrs) {
    const p = byId.get(a.projectId);
    if (!p) continue;
    out.set(a.address, {
      projectId: p.id,
      projectName: p.projectName,
      paymentKind: p.paymentKind,
      issuedMonth: a.issuedMonth,
    });
  }
  return out;
}
