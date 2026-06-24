# Avaliação competitiva — Account Track (ZecHub Hackathon 2026)

> Honesto, sem otimismo. Baseado em pesquisa de fontes primárias (código do zkool2, página do hackathon, fórum Zcash, ZIPs).

## Veredito

**Competitivo SE — e somente se — um spike de "ler UFVK real em mainnet" passar nos próximos ~4 dias. Caso contrário, não competitivo.**

O que temos é um back-office **bem arquitetado sobre dados mock**. O account track exige **protótipo que interage com mainnet**. Esse é o fato negativo nº 1: nada nosso tocou a cadeia ainda. Engenharia limpa (typecheck, build, 26 testes) é higiene, não maturidade — os testes cobrem mock, não comportamento on-chain. A tese está certa e há gap de mercado documentado, mas hoje não ganha.

## Contexto da competição

- **ZecHub Hackathon 2026** tem um track de **Accounting**. Pool ~25 ZEC, ~51 dias, **julgamento comunitário (ZecHub DAO)** — sem rubrica numérica publicada → narrativa, demo e facilidade de rodar pesam tanto quanto código.
- **Requisito:** protótipo interativo com **mainnet** (não só testnet/regtest).
- **Gap de mercado citado no fórum oficial:** _"nenhuma ferramenta converte viewing keys em ledgers/demonstrações exportáveis"_ — é exatamente o nosso ângulo, mas é também o que ainda não entregamos (sem export contábil).
- **Concorrente conhecido:** "ZECA" (reconciliação com viewing keys) — não foi avaliado a fundo; se já exporta contra mainnet, parte do nosso diferencial encolhe.

## Stack: trocar zallet → zkool2 (seu instinto estava certo)

Confirmado por código-fonte (`github.com/hhanh00/zkool2`):

| Critério                | zallet alpha                                       | **zkool2 (`zkool-graphql`)**             |
| ----------------------- | -------------------------------------------------- | ---------------------------------------- |
| Importa UFVK watch-only | **Não** (RPC só Sprout/Sapling — issue zcash#5687) | **Sim** (`createAccount`)                |
| Memo de saída (OVK)     | —                                                  | **Sim** (`try_output_recovery_with_ovk`) |
| FROST                   | Não                                                | **Sim** (Orchard, DKG t-de-n, PCZT)      |
| Integrável headless     | RPC limitado                                       | **GraphQL HTTP/WS + Docker**             |

zkool2 fecha 3 lacunas de uma vez (node real + payment/FROST + memo de saída). **Mas é uma aposta não validada ponta a ponta.**

### Hardening obrigatório (não opcional)

- O servidor sobe **sem auth em `0.0.0.0`** ("Everyone has full access"). Configurar **JWT (ES256) read-only por conta**, nunca expor a porta.
- **Importar só UFVK (nunca spending key)** — mantém custódia zero.
- **Pinar a tag** da imagem (não `:latest`); deps são experimentais (`orchard unstable-frost`, `pczt 0.6`).

## ⚠️ Spike go/no-go (faça ANTES de qualquer roadmap de features)

Quatro pré-condições **não verificadas** — se falharem, o plano cai:

1. `createAccount` com **UFVK puro** opera watch-only sem quebrar no caminho de pagamento.
2. **O memo binário `0xFF` (nosso holerite) sobrevive intacto** via `memosByTransaction` — o resolver parece focado em `Memo::Text`. **Metade do nosso diferencial depende disso.**
3. Estabilidade da API GraphQL (recente, sem versionamento próprio).
4. Sincronizar uma UFVK real em **mainnet** (ordens de magnitude mais lento/arriscado que regtest).

**Plano B** se falhar em 4 dias: caminho read-only mais simples (lightwalletd + librustzcash) só para provar leitura de UFVK em mainnet. Decisão com data marcada, não open-ended.

## Roadmap mínimo (corte por aqui se faltar tempo)

1. **P0 — Spike mainnet read-only com zkool2** (validar as 4 pré-condições). Inegociável e de maior risco. Destrava o requisito de submissão.
2. **P1 — Export contábil CSV (Xero) + IIF (QuickBooks)**. Baixo esforço, ataca o gap de mercado documentado, "o contador usa amanhã". Maior credibilidade por linha.
3. **P5 — Entregáveis de submissão**: vídeo demo, README reproduzível, licença OSS, post no Discord. Baixo esforço mas **obrigatório** (julgamento comunitário).

- **Stretch (não comprometer):** FROST t-de-n (só Orchard; demo gravada, não ao vivo), subledger ASU 2023-08, memo de saída via OVK.

## Honestidade sobre "disclosure seletivo"

O que conseguimos hoje é um **"Audit Receipt" de aplicação** (`ref_id` + `sha256` + `txid` + valor/data via UFVK + assinatura nossa) — **não** é disclosure seletivo criptográfico trustless. ZIP-304 está morto (só Sprout); ZIP-311 é draft sem Orchard. **Não vender como "selective disclosure"** diante de juízes que conhecem a spec — vira overclaim. Posicionar honestamente como "recibo de aplicação enquanto ZIP-311 não amadurece"; a prova trustless vem da reconciliação UFVK + txid on-chain, não da assinatura.

## Fontes

zkool2 repo · zechub.wiki/hackathon · forum.zcashcommunity.com/t/.../56300 (gap de mercado) · zips.z.cash/zip-0311 · zcash#5687 (zallet não importa Unified) · ASU 2023-08 (Deloitte/Grant Thornton).
