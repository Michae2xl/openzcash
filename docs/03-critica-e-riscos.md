# Crítica Adversarial — Riscos e Decisões Abertas

> Auditoria do design v1 ([01-arquitetura.md](01-arquitetura.md)). Nenhum item contradiz os fatos da pesquisa — são **completude faltante** sobre fatos que a própria pesquisa já mencionou.

## Os 3 maiores furos

1. **Fees (ZIP-317), notas/change e expiry de transação ausentes** — quebram corretude contábil e operação real.
2. **UFVK centralizada + irrevogável num serviço online 24/7** — maior risco de privacidade, subdimensionado.
3. **What-you-see-is-not-what-you-sign** na ponte FROST — sem defesa independente do Constructor.

---

## A. Afirmações imprecisas / inconsistências internas

- **A1 [CRÍTICO] Batch de folha numa única tx (ZIP-321 `paramindex`) combina mal com FROST e privacidade.** Atomicidade indesejada (um paycheck inválido derruba a folha) e correlação on-chain entre funcionários. Recomendação: **tx individual por contracheque**.
- **A2 [CRÍTICO] OVK não garante recuperação do memo de saída.** Com FROST/PCZT a construção é distribuída; quem injeta a OVK (Constructor) pode não deter a ovk da conta. O corpo do design trata como fato o que a pesquisa lista como gap — inconsistência. **Validar em teste prático.**
- **A3 [IMPRECISO] Trial-decryption via Zallet** assume API não confirmada (método RPC de export de UFVK / scan de memos).
- **A4 [IMPRECISO] ZODL e UFVK Orchard.** Suporte a UFVK **Orchard** na ZODL não confirmado (evidência antiga só de Sapling VK). Se a auditoria precisa de OVK Orchard e a ZODL só importa Sapling, ela é inútil para auditoria Orchard.
- **A5 [IMPRECISO] `payment_disclosure` (ZIP-311)** listado como capacidade da stack sem evidência de API.

---

## B. Lacunas de domínio Zcash

- **B1 [CRÍTICO] Change/notas.** Gasto consome notas inteiras e gera nota de change. O subledger lote-a-lote precisa modelar isso, senão o cost basis sai errado.
- **B2 [CRÍTICO] Fees ZIP-317.** Ausentes. Cada tx tem fee (despesa contábil + débito de tesouraria); `value_zec` recebido ≠ ZEC que sai (valor + fee). Afeta reconciliação e quanto ZEC a tesouraria precisa ter.
- **B3 [CRÍTICO] Expiry (`expiryHeight`).** Coleta de shares FROST com aprovação humana pode demorar mais que o expiry → tx expira. Precisa de timeout vs expiry, re-montagem da PCZT, idempotência.
- **B4 [ALTO] Outputs órfãos.** A tesouraria recebe/envia ZEC não gerado pelo sistema (pagamento manual, devolução, depósito de exchange) — sem nosso memo `0xFF`. Precisa de fluxo de classificação manual/exceção de primeira classe.
- **B5 [ALTO] Rotação de endereços / fraude de cadastro.** Endereço shielded do funcionário muda (diversified). Modelo precisa de histórico de endereços + **prova de posse / canal seguro** ao cadastrar (vetor de fraude de payroll).
- **B6 [MÉDIO] FVK vê saídas só se a tx foi construída com a ovk da conta** (liga A2/B4).
- **B7 [MÉDIO] Shielding/deshielding (transparent↔shielded).** ZEC de exchange entra transparente; mover para Orchard é tx sem memo. Cost basis precisa rastrear através do shield.
- **B8 [MÉDIO] Reorgs / birthday height.** Reorg pode reverter um `paycheck.chain_tx_id` já `matched`. Definir profundidade de confirmação.

---

## C. Privacidade e Compliance

- **C1 [CRÍTICO] UFVK centralizada des-blinda toda a tesouraria.** Mantê-la num serviço online 24/7 é o pior lugar para uma chave irrevogável que revela todos os salários. Faltam: HSM/enclave para trial-decryption isolado; segregação real por conta; plano para vazamento (irreversível).
- **C2 [CRÍTICO] PII no memo — não dá para ter os dois jeitos.** Valor on-chain é imutável e decifrável por qualquer detentor presente OU futuro da UFVK. **Crypto-shredding não funciona para memos on-chain.** Remover (não só "opcional") campos `gross/net` inline; só `ref_id + sha256`.
- **C3 [ALTO] RBAC ausente.** "Auditoria total" = ver salário do CEO. Orchard não fatia visibilidade por sub-chave ⇒ RBAC tem de ser na **camada de aplicação** (decifrar e filtrar), **nunca distribuir a UFVK**. Distinguir "dar acesso à app" (filtrável, revogável) de "dar a UFVK" (total, irrevogável).
- **C4 [ALTO] Retenção vs esquecimento.** `memo_decoded_json`/`memo_raw_bytes` no Postgres também caem sob GDPR — precisa de purga/crypto-shred no banco, não só no store de payslip. Conflito retenção fiscal (anos) vs minimização não reconciliado.
- **C5 [MÉDIO] Jurisdição.** Todo o framework é IRS/US (W-2, FICA, FUTA, 1099, ASU 2023-08). Se a empresa não é dos EUA, metade do Payroll/Reporting está na jurisdição errada.
- **C6 [MÉDIO] Travel Rule / AML.** Pagar em cripto e operar tesouraria pode disparar obrigações de reporte (MSB? limites?).

---

## D. Segurança da ponte FROST / broadcast

- **D1 [CRÍTICO] What-you-see-is-not-what-you-sign.** Constructor comprometido monta pagamento para o atacante; se a UI que mostra a PCZT é do mesmo sistema, mostra-se A e assina-se B. Precisa de verificação **independente** do conteúdo da PCZT no lado de cada signatário (display em dispositivo/HSM separado) + hash assinado do `payment_request` aprovado.
- **D2 [CRÍTICO] frostd como MITM/DoS.** Pode censurar/atrasar shares (→ expiry, B3). O crate **rerandomized/redpallas não foi auditado** (NCC excluiu) — risco para comitê de tesouraria.
- **D3 [ALTO] Nonce/round-1 reuse.** Reuso de nonces pode vazar a `ask`. Precisa de gestão de estado de nonce, idempotência segura, proteção a replay.
- **D4 [ALTO] Privacidade de rede no broadcast.** Broadcast via Zebra expõe IP; deveria ir por Tor/conexão privada.
- **D5 [MÉDIO] DKG / rogue-key.** Falta verificação de shares (VSS) e canais autenticados no setup; "share refresh" sem modelo de ameaça.
- **D6 [MÉDIO] Key manager at-rest.** "UFVK criptografada at-rest" sem definir KMS/HSM, rotação, dono da chave-mestra. Crypto-shred só é forte se a chave destruída for irrecuperável (sem backup).

---

## E. Perguntas priorizadas ao usuário

**Bloqueantes (P0):**

1. **Jurisdição fiscal/trabalhista real?** (Brasil / EUA / UE / outra) — define Payroll/Reporting.
2. **ZODL** = carteira pública (Zashi rebrand), fork interno ou homônima? Importa **UFVK Orchard** ou só Sapling?
3. **A stack (Zebra+Zallet) expõe hoje:** (a) export de UFVK, (b) scan/trial-decryption programático de memos, (c) PCZT com OVK da conta setada? (`zallet rpc help`).
4. **"zkool"** = `hhanh00/zkool2` ou `frost-tools/frostd`?
5. **Threshold t-de-n** concreto e onde vivem os shares (humanos? HSMs?).

**Alta (P1):** 6. **PII no memo:** aceita qualquer valor/dado identificável on-chain (irreversível)? (Recomendação: NÃO — só `ref_id + sha256`.) 7. **UFVK distribuída a auditores externos** ou só via app com RBAC? (Recomendação: nunca distribuir.) 8. **RBAC:** quem vê salários individuais vs agregados? 9. **Onde vivem a UFVK e chaves at-rest?** HSM/KMS? Enclave em vez de processo 24/7? 10. **Liquidez fiat para impostos** existe? Transparente ou shielded?

**Média (P2):** 11. **Folha em UMA tx (batch) ou UMA tx por funcionário?** (Recomendação: individual.) 12. **Cadastro/verificação do endereço do funcionário** (prova de posse?). 13. **Retenção fiscal exata** vs purga GDPR no banco. 14. **Fonte de preço oficial** (CoinGecko vs CoinMarketCap) e granularidade. 15. **Tolerância a tx expirada / re-tentativa** (janela maker-checker vs expiryHeight). 16. **Reorgs:** profundidade de confirmação antes de "matched/final". 17. **Crate Re-Randomized FROST** não auditado — exigência de só usar componentes auditados?
