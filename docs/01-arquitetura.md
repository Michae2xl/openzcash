# Design de Arquitetura — Tesouraria/Folha em ZEC com Viewing Keys

> Fundamentado na pesquisa de domínio ([02-fatos-zcash.md](02-fatos-zcash.md)). Suposições marcadas como **[SUPOSIÇÃO]**; itens que dependem do ambiente real como **[CONFIRMAR]** (consolidados na §7 e em [03-critica-e-riscos.md](03-critica-e-riscos.md)).
>
> ⚠️ Esta é a **v1** do design. A crítica adversarial ([03](03-critica-e-riscos.md)) apontou furos que **devem** ser incorporados antes de implementar — sobretudo **fees (ZIP-317)**, **notas/change**, **expiry de transação**, **UFVK centralizada e irrevogável**, e **what-you-see-is-not-what-you-sign** na ponte FROST.

---

## 1. Visão e princípios (ênfase em SEGURANÇA)

Plataforma **read-only sobre a chain** + **orquestrador de pagamentos sem custódia de spend keys**. Mapa da metáfora do cheque: `PAY TO = endereço destino`, `valor = ZEC`, `MEMO = campo de memo encriptado (512 bytes)`, `assinatura = assinatura threshold via FROST (RedPallas/Orchard)`.

Princípios inegociáveis:

- **NENHUMA spend key no sistema.** Viewing keys (FVK/UFVK) nunca gastam. A _Spend Authorizing Key_ (`ask`) vive só como _shares_ FROST/zkool, jamais reconstruída. O sistema só armazena/usa viewing keys.
- **Assinatura externa e criptograficamente forçada.** O limiar t-de-n do FROST É a política maker-checker: sem `t` signature shares, não finaliza — mais forte que aprovação só em banco.
- **Separação de domínios de confiança.** Serviço **Auditor** (carrega UFVK, read-only) fisicamente separado do serviço **Tesouraria/Assinatura** (monta PCZT, coordena FROST). O `frostd` é coordenação de mensagens, **não confiável para custódia**.
- **PII de folha NUNCA on-chain em claro.** Ledger é imutável/append-only — colide com direito ao esquecimento (GDPR Art. 17). O memo carrega só `ref_id + hash`; o holerite completo fica off-chain, encriptado, com **crypto-shredding**.
- **UFVK é segredo de altíssimo privilégio.** Revela TODO o histórico financeiro e memos (salários). Não revogável isoladamente — se vazar, a única mitigação é migrar fundos para nova conta/seed. Custódia controlada, canal encriptado, log de acesso, rotação por conta.
- **Correções são estornos, nunca edições.** Imutabilidade da chain ↔ double-entry com lançamentos imutáveis e reversões.
- **Validação no boundary.** Schema do memo (≤512 bytes), URI ZIP-321 e endereço (deve ser shielded) validados antes de montar a PCZT.

---

## 2. Módulos de domínio

| Módulo                      | Responsabilidade                                                                                                                                                               | Âncora factual                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Integração Zcash**        | Cliente RPC para Zebra + Zallet. Scan/trial-decryption de outputs Orchard/Sapling com a UFVK; montagem/broadcast de PCZT; coordenação FROST via frostd. Adapter MOCK para dev. | Zallet = wallet full-node Rust sobre librustzcash, via JSON-RPC; PCZT central; trial-decryption com UFVK.                           |
| **Gestão de Viewing Keys**  | Onboarding e custódia da UFVK; controle de acesso e log; escopo (UIVK só-entradas vs UFVK completa).                                                                           | UFVK = IVK+OVK ⇒ auditoria total (entradas, saídas, change, memos dos dois lados). UIVK só vê entradas.                             |
| **Contabilidade/Ledger**    | Subledger cripto lote-a-lote (FIFO/LIFO/Spec-ID/WAC); double-entry imutável com estornos; reconciliação on-chain↔subledger↔GL.                                                 | Cost basis lote-a-lote, per-wallet; tie-out antes do fechamento.                                                                    |
| **Reporting**               | Holdings (fair value ASU 2023-08 + rollforward), ganho/perda realizado/não-realizado, exportação IIF/CSV/API.                                                                  | ASC 350-60: fair value em earnings + rollforward; QuickBooks Desktop = IIF, QBO/Xero = CSV/API.                                     |
| **RH/Funcionários**         | Cadastro, endereço shielded de pagamento (UA/Orchard), chave de encriptação por funcionário (crypto-shredding), retenção.                                                      | Memo escopo individual (um contracheque por funcionário); funcionário lê o próprio memo.                                            |
| **Folha/Payroll**           | Payroll runs; FMV USD na data; retenções; geração de dados fiscais; vínculo paycheck→tx→payslip_id.                                                                            | Salário cripto = wage tributável pelo FMV na data; retenções remetidas em moeda fiat.                                               |
| **Pagamentos & Aprovações** | Montagem ZIP-321; geração do memo estruturado; maker-checker espelhando papéis PCZT; orquestração dos 2 rounds FROST; audit trail.                                             | Papéis PCZT (Creator/Constructor/Prover/Signer/Combiner/Finalizer); "mostrar PCZT antes de assinar"; threshold = nº de aprovadores. |

---

## 3. Modelo de dados (tabelas principais)

Três camadas estritamente separadas: **(a) on-chain raw**, **(b) subledger contábil**, **(c) GL/relatório**.

**Viewing Keys**

- `viewing_key` — `id`, `account_label`, `ufvk_encrypted`, `kind` (`ufvk`|`uivk`), `revision` **[CONFIRMAR: uview1 rev0 vs uvf rev2]**, `created_at`, `rotated_from_id`.
- `vk_access_log` — `id`, `viewing_key_id`, `principal`, `granted_at`, `scope`, `reason`.

**On-chain raw**

- `chain_tx` — `id`, `txid`, `block_height`, `block_timestamp`, `pool` (`orchard`|`sapling`), `fee_zat`.
- `chain_output` — `id`, `chain_tx_id`, `direction` (`in`|`out`|`change`), `pool`, `value_zatoshis`, `recipient_address`, `memo_raw_bytes` (≤512), `memo_decoded_json` (nullable), `decrypted_via` (`ivk`|`ovk`). _Saídas/memos de saída só via OVK ⇒ exige UFVK._

**Price Oracle (imutável)**

- `price_snapshot` — `id`, `date`, `source`, `zec_usd`, `captured_at`. Toda conversão referencia `price_snapshot.id`.

**Subledger contábil**

- `lot` — `id`, `acquisition_date`, `qty_zec`, `cost_usd`, `price_snapshot_id`, `chain_tx_id`, `method`, `remaining_qty`.
- `disposition` — `id`, `lot_id`, `chain_tx_id`, `qty_zec`, `proceeds_usd`, `realized_gain_loss`, `price_snapshot_id`.
- `journal_entry` / `journal_line` — double-entry imutável; `reversal_of_id`; `account_code`.
- `reconciliation` — `id`, `period`, `chain_tx_id`, `journal_entry_id`, `status` (`open`|`matched`|`exception`).

**RH/Payroll**

- `employee` — `id`, `name_encrypted`, `encryption_key_id` (deletar = crypto-shred), `retention_until`.
- `employee_address` — `id`, `employee_id`, `shielded_address` (UA Orchard), `verified_at`, `active`. _(histórico de endereços — ver crítica B5)_
- `payroll_run` — `id`, `period`, `status`, `total_zec`, `created_by`.
- `paycheck` — `id`, `payroll_run_id`, `employee_id`, `value_zec`, `fmv_usd`, `price_snapshot_id`, `withholding_*`, `payslip_id`, `chain_tx_id`.
- `payslip` (off-chain, mutável, encriptado) — `id`, `employee_id`, `encryption_key_id`, `content_encrypted`, `sha256` (= hash no memo).

**Pagamentos & Aprovações**

- `payment_request` — `id`, `zip321_uri`, `recipient_address`, `value_zec`, `memo_struct_json`, `memo_bytes_len`, `category_account_code`, `kind` (`payroll`|`vendor`).
- `pczt` — `id`, `payment_request_id`, `pczt_blob`, `state` (`created`|`constructed`|`proved`|`signed`|`finalized`|`broadcast`), `expiry_height`.
- `approval` — `id`, `pczt_id`, `approver`, `frost_share_ref`, `round` (1|2), `decision`, `timestamp`.

---

## 4. Fluxos end-to-end

### (a) Onboarding da UFVK corporativa

1. Operador exporta a UFVK da conta corporativa **[CONFIRMAR: método RPC do Zallet — `zallet rpc help`; fallback: derivar via libs Rust zcash_address/zcash_client_backend]**.
2. Sistema recebe por canal encriptado, valida que inclui componente **Orchard**, trata como string **opaca** (Bech32m+F4Jumble).
3. Persiste `viewing_key` criptografada at-rest; registra `vk_access_log`. Usar **UFVK (não UIVK)**: auditoria precisa do OVK para ler memos de saída/change.

### (b) Scanning + reconciliação (com decodificação de memos)

1. Serviço Auditor (read-only, isolado) carrega a UFVK e faz **trial-decryption** das Output/Action descriptions Orchard/Sapling.
2. Por output: grava `chain_output`. Decodifica memo (ZIP-302): `0xFF` ⇒ payload estruturado privado (§5); `0x00–0xF4` ⇒ texto UTF-8; `0xF6` ⇒ vazio.
3. Congela `price_snapshot` para `block_timestamp`; cria/atualiza `lot`/`disposition`; gera `journal_entry`.
4. Reconciliação casa `chain_tx` ↔ `journal_entry` por `txid`; marca exceções; tie-out antes do fechamento. **Tratar outputs órfãos** (tx sem nosso memo — ver crítica B4) como categoria de primeira classe.

### (c) Emissão de contra-cheque (payroll run → broadcast → reconciliação)

1. **Payroll run**: seleciona funcionários; calcula `value_zec`, `fmv_usd`, retenções, **fee ZIP-317**.
2. **Montar ZIP-321**: URI `zcash:` com `address` (UA shielded Orchard — transparente rejeitado, não carrega memo), `amount`, `memo` (base64url, ≤512 bytes). **[DECISÃO: tx individual por funcionário vs batch — ver crítica A1; recomendação: individual]**.
3. **Memo estruturado**: payload §5 (`0xFF` + TLV/CBOR), validar `len ≤ 512`. Holerite completo off-chain; memo carrega só `payslip_id + sha256`.
4. **PCZT**: Creator/Constructor monta destino+valor+memo. **A OVK da conta DEVE ser usada na construção**, senão o memo de saída fica irrecuperável na auditoria **[CONFIRMAR como zallet/zkool setam a OVK — crítica A2]**.
5. **Assinatura FROST t-de-n**: signatários (Checkers) revisam o conteúdo da PCZT e assinam (Round 1 nonces; Round 2 shares; agregação via `frostd`). Sem `t` shares, não finaliza. Registrar cada `approval`. **Defender contra what-you-see-is-not-what-you-sign — crítica D1.**
6. **Broadcast** via Combiner+Finalizer → Zebra (idealmente por Tor — crítica D4). Respeitar `expiry_height` vs janela de aprovação (crítica B3).
7. **Reconciliação automática**: o output é detectado no próximo scan (b) via OVK com o mesmo memo ⇒ casa `paycheck.chain_tx_id`. Funcionário lê o próprio memo (entrega do holerite).

### (d) Relatórios e exportação

1. **Holdings**: fair value (ASU 2023-08) + rollforward.
2. **Ganho/perda**: realizado por `disposition`; não-realizado por remensuração.
3. **Exportação**: IIF (QuickBooks Desktop), CSV (QBO/Xero), API com two-way sync de chart of accounts. Cada categoria do memo → `account_code`.

---

## 5. Esquema do MEMO estruturado (≤512 bytes)

Prefixo **`0xFF`** (ZIP-302, dados privados arbitrários machine-readable). Corpo = **TLV ou CBOR compacto** (não JSON puro), versionado.

```
byte[0]      = 0xFF                       (ZIP-302 arbitrary/private)
byte[1]      = schema_version (uint8)
byte[2]      = doc_type (1=payslip, 2=invoice, 3=category-only)
--- corpo TLV / CBOR ---
ref_id         (payslip_id ou invoice_no)    ~16 bytes
period         (YYYYMM)                        3 bytes
account_code   (categoria contábil)            4 bytes
payslip_sha256 (integridade do doc off-chain) 32 bytes
--- padding zeros até 512 antes de encriptar ---
```

- **Regra de PII**: o caminho seguro é o memo carregar **só `ref_id + sha256`**; o resto off-chain. Valores (`gross/net`) inline são **desaconselhados** — uma vez on-chain, são imutáveis e decifráveis por qualquer detentor (presente ou futuro) da UFVK; **crypto-shredding NÃO funciona para memos on-chain** (crítica C2).
- **Fallback (overflow)**: se exceder 512 bytes, gravar só `payslip_sha256`/`ref_id` e guardar o doc off-chain.
- **Evolução**: manter o memo desacoplado do transporte para migrar à **ZIP-231 (Memo Bundles, ~16 KiB, alvo NU7)** sem reescrever a contabilidade **[CONFIRMAR: ZIP-231 ainda Draft, não em produção]**.

---

## 6. Stack técnico recomendado

**Aplicação**: Next.js (App Router) + TypeScript + Postgres + Drizzle ORM. Many-small-files, baixo acoplamento.

**Camada de integração Zcash** (Repository Pattern — interface única, implementações intercambiáveis):

```ts
interface ZcashGateway {
  exportUfvk(account): Promise<Ufvk>                         // Zallet RPC [CONFIRMAR método]
  scanOutputs(ufvk, fromHeight): AsyncIterable<ChainOutput>  // trial-decryption
  decodeMemo(bytes): MemoStruct | TextMemo | EmptyMemo       // ZIP-302
  buildZip321(payments): Zip321Uri
  createPczt(uri): Pczt                                      // Creator/Constructor
  proveOrchard(pczt): Pczt                                   // Prover
  finalizeAndBroadcast(pczt): Txid                           // Combiner/Finalizer → Zebra
}
interface FrostCoordinator {                                  // via frostd / frost-client
  round1(pcztId): Commitments
  round2(pcztId, commitments): SignatureShares
  aggregate(...): SignedPczt
}
```

- **Adapter MOCK (dev)**: in-memory, simula scan/decode/sign sem node real — permite desenvolver toda a app sem Zebra/Zallet/FROST.
- **Adapter REAL**: JSON-RPC com Zallet (sobre Zebra) e `frostd`. Preferir `frost-tools` como **biblioteca** a shellar o CLI. Inspirar-se no fluxo PCZT+FROST do `zcash-devtool`/`zkool`.

**Infra existente, sempre atrás de interfaces:**

- **Zebra**: blocos/broadcast.
- **Zallet**: export de UFVK, trial-decryption, montagem de PCZT **[CONFIRMAR APIs]**.
- **FROST/zkool**: assinatura threshold (RedPallas/Orchard). O sistema só envia a PCZT e coleta shares; nunca vê a `ask`. Usar **DKG** (não Trusted Dealer) + `share refresh` para rotação sem mudar o endereço/UFVK.

---

## 7. Decisões a confirmar antes de codar

Consolidadas em [03-critica-e-riscos.md](03-critica-e-riscos.md) §E (lista priorizada P0/P1/P2). Resumo dos bloqueantes:

1. **Jurisdição fiscal/trabalhista** real da empresa (define todo Payroll/Reporting; design atual é IRS/US).
2. **ZODL** = Zashi rebrandeada (confirmado por evidência) — confirmar suporte a **UFVK Orchard**.
3. **Capacidades da stack hoje**: export de UFVK, scan programático de memos, PCZT com OVK setada (`zallet rpc help`).
4. **"zkool"** = `hhanh00/zkool2` (wallet) ou `frost-tools/frostd` (Zcash Foundation)?
5. **Threshold t-de-n** concreto e onde vivem os shares.
6. **Política de PII no memo** (recomendação: só `ref_id + sha256`).
7. **Onde a UFVK e chaves at-rest vivem** (HSM/KMS? enclave?).
