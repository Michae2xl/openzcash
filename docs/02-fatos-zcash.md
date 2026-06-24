# Fatos técnicos verificados — Zcash (pesquisa de domínio)

> Coletados via pesquisa multi-frente (7 frentes, ~106 buscas web). Confiança e lacunas anotadas por frente. Fontes ao final.

## Memo encriptado (confiança: alta)

- Campo de memo de **512 bytes** por output **shielded** (Sapling/Orchard). **Outputs transparentes não têm memo.**
- O conteúdo é encriptado junto com a nota; aparece on-chain **cifrado** — só é legível por quem tem a viewing key adequada.
- **ZIP-302** define a interpretação do 1º byte do memo: `0x00–0xF4` = texto UTF-8; `0xF5` = reservado; `0xF6` = memo vazio; `0xFF` = **dados privados/arbitrários machine-readable** (o que usaremos para o payload estruturado).
- Blog ECC (2016, era Sprout) é a fonte da _intenção/casos de uso_; o protocolo/ZIP-302 é a fonte primária para Sapling/Orchard.
- **Gap:** ZIP-231 (Memo Bundles, memos maiores ~16 KiB, alvo NU7) ainda **Draft** — não em produção; não acoplar nada a memos >512 bytes hoje.

## Viewing keys (confiança: média)

- **IVK** (incoming) vê **entradas**. **OVK** (outgoing) permite recuperar **saídas/change e seus memos**. **FVK** = IVK+OVK. **UFVK** (unified) agrega Orchard+Sapling+transparent.
- Para **auditoria contábil completa** (ver saídas, change e memos dos dois lados) é preciso a **UFVK** (não basta a UIVK só-entradas).
- Memo de **saída** só é recuperável se a tx foi **construída usando a OVK da conta** — crítico para os contracheques (ver crítica A2/B6).
- UFVK é string **opaca** (Bech32m + F4Jumble) — tratar como blob, não manipular bytes. Revisões: `uview1` (rev0) vs `uvf` (rev2) **[CONFIRMAR qual a stack exporta]**.
- ZIPs: **ZIP-32** (derivação), **ZIP-316** (unified keys/addresses), ZIP-310.
- **Gap:** método RPC exato do Zallet para exportar UFVK não confirmado (`zallet rpc help` no ambiente). Suporte atual a import/export de unified VK no Zallet não confirmado em changelog.

## Zallet (confiança: alta)

- Carteira **full-node em Rust** sobre **librustzcash**, sucessora da wallet embutida no zcashd. Integração via **JSON-RPC**. Escaneia a chain via Zebra/lightwalletd. Trabalha com **PCZT** (Partially Created Zcash Transactions) e suporta assinatura externa (hardware/FROST).

## Pagamentos e memos — ZIP-321 / ZIP-302 / ZIP-231 (confiança: alta)

- **ZIP-321**: URIs `zcash:` de payment request — `address`, `amount` (≤8 casas, ponto decimal), `memo` (**base64url sem padding**), múltiplos pagamentos via `paramindex` (`address.1`, `amount.1`, `memo.1`…).
- **Não há ZIP padronizando schema de holerite no memo** — é acordo privado da aplicação, sob prefixo `0xFF`. Recomendado **TLV ou CBOR compacto** (não JSON puro) por densidade de bytes.
- **Gaps:** não medido quantos campos cabem em 511 bytes num TLV/CBOR real; diferenças Orchard vs Sapling no memo ZIP-321 não confirmadas; como zallet/ZODL expõem envio com memo não verificado.

## FROST / threshold (confiança: média)

- **FROST** = Schnorr threshold (t-de-n). Tooling oficial da Zcash Foundation: **frost-core / frostd / frost-client / frost-tools**. Para Zcash usa-se o esquema **Re-Randomized (RedPallas/Orchard)**.
- Fluxo: **DKG** gera chave de tesouraria com `ask` dividida em shares → sistema monta **PCZT** → 2 rounds (commitments/nonces; signature shares) coordenados via `frostd` → finalize → broadcast. O threshold é a política maker-checker.
- **Gaps importantes:**
  - **"zkool"** ambíguo: as fontes mostram `hhanh00/zkool2` como **wallet de terceiros** (sucessor do Ywallet) com FROST multisig; o tooling **oficial** de threshold é `frost-tools/frostd`. **Confirmar qual binário a empresa usa.**
  - Auditoria NCC Group v0.6.0 **excluiu** `rerandomized`/`redpallas` do escopo — **crate exato do Zcash não confirmado como auditado**. Risco para tesouraria.
  - Coordenação FROST↔PCZT end-to-end e maker-checker explícito vêm de newsletter, não de doc técnico detalhado.

## ZODL (confiança: média)

- Evidência pública forte de que **Zodl = Zashi rebrandeada** (início 2026): `zodl.com/zashi-is-becoming-zodl`, `github.com/zodl-inc`, App Store "Zodl - Zcash Wallet". Mantém a base ECC (zallet/librustzcash).
- **Gaps:** conteúdo de zodl.com não verificado integralmente (HTTP 403); suporte a **UFVK Orchard** (vs só Sapling VK) na versão atual **não confirmado**; encoding/limite de memo renderizado pela UI não confirmado.

## Contabilidade / Payroll cripto (confiança: alta)

- Cost basis = **subledger lote-a-lote** (FIFO/LIFO/Spec-ID/WAC), **per-wallet** (IRS 2025); tie-out subledger=GL antes do fechamento.
- **ASU 2023-08 / ASC 350-60**: cripto elegível a **fair value em earnings** + rollforward anual.
- Exportação: **IIF** (QuickBooks Desktop), **CSV/API** (QBO/Xero). Padrão de mercado: Cryptio/Bitwave (two-way sync de chart of accounts).
- Salário em cripto = **wage tributável pelo FMV na data**; retenções remetidas em **fiat**.
- **GDPR Art. 17** (esquecimento) colide com imutabilidade → PII off-chain + crypto-shredding.
- **Gaps:** material 100% IRS/US + GDPR/UK — **jurisdição real da empresa não pesquisada** (ex.: Brasil/RFB); timing de conversão ZEC→fiat para impostos a desenhar.

---

## Fontes

ECC / specs: encrypted-memo-field, ZIP-302, ZIP-316, ZIP-310, ZIP-321, ZIP-311, ZIP-312, ZIP-231, ZIP-032, protocol/sapling.pdf, zcash.readthedocs memos.
Viewing keys: ECC "explaining viewing keys 2" e "viewing-keys-selective-disclosure", zkonomics, orchard/design/keys, z_export/importviewingkey.
Zallet: zcash.github.io/wallet/cli/rpc, blockchaincommons zewif.
FROST: frost.zfnd.org (zcash, technical-details), zfnd "state of frost", ZcashFoundation/frost, frost-tools, frost-zcash-demo, docs.rs/pczt, zcash-devtool walkthrough, github.com/hhanh00/zkool2.
ZODL: zodl.com, github.com/zodl-inc, App Store/Play Store, cryptonewsz seed funding, zechub digest.
Contabilidade: koinly, recap.io, theaccountantquits (IIF), coingecko/coinmarketcap historical, Deloitte/Grant Thornton ASU 2023-08, IRS digital assets FAQ, tokentax, Thomson Reuters stablecoin payroll, tres.finance, cryptio, bitwave, secureprivacy GDPR, gdpreu payroll.

Lista completa de URLs no resultado do workflow `wf_8ecaea79-62c`.
