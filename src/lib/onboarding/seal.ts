/**
 * Sealed-box (libsodium `crypto_box_seal`) para o onboarding — padrão assimétrico
 * inspirado no CryptPad Forms: o navegador cifra a UFVK com a CHAVE PÚBLICA do
 * backend; só o backend (chave privada num secret) decifra. A chave nunca trafega
 * em claro — protege de logs/proxy/CDN. (Endereços transparentes são públicos e
 * NÃO usam isto.)
 */

import "server-only";
import sodium from "libsodium-wrappers";

let ready = false;
async function init(): Promise<void> {
  if (!ready) {
    await sodium.ready;
    ready = true;
  }
}

/** Chave pública (base64) para o formulário cifrar. Segura para expor. */
export function getOnboardingPublicKey(): string | null {
  return process.env.ONBOARDING_PUBLIC_KEY ?? null;
}

/** Decifra um sealed-box (base64) feito no browser. Lança se as chaves faltarem. */
export async function openSealed(ciphertextB64: string): Promise<string> {
  await init();
  const pk = process.env.ONBOARDING_PUBLIC_KEY;
  const sk = process.env.ONBOARDING_SECRET_KEY;
  if (!pk || !sk) throw new Error("Onboarding keys are not configured.");
  const variant = sodium.base64_variants.ORIGINAL;
  const opened = sodium.crypto_box_seal_open(
    sodium.from_base64(ciphertextB64, variant),
    sodium.from_base64(pk, variant),
    sodium.from_base64(sk, variant),
  );
  return sodium.to_string(opened);
}
