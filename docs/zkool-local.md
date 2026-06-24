# Rodar o ZEC Back-office 100% local (engine zkool)

A engine de wallet é o **zkool2** (`zkool_graphql`, licença MIT) rodando como serviço ao
lado do app. Ela conecta a um **lightwalletd público** (`zec.rocks`) — sem full node
próprio — importa **UFVK watch-only** e expõe GraphQL com o histórico completo
(entradas, **saídas** e memos decodificados).

## 1. Subir a engine

```bash
docker compose up -d zkool          # compila o zkool_graphql (1ª vez ~15-20 min) e sobe em :8000
# Postgres containerizado (opcional, se não tiver um local):
#   docker compose --profile db up -d
```

GraphiQL: <http://localhost:8000/> · endpoint: `http://localhost:8000/graphql`.

## 2. Apontar o app para a engine

No `.env.local`:

```
ZCASH_GATEWAY=zkool
ZKOOL_GRAPHQL_URL=http://localhost:8000/graphql
```

## 3. Importar a viewing key da tesouraria (watch-only)

```bash
npm run import-ufvk -- <UFVK> tesouraria <birthHeight>
```

- `<UFVK>`: unified full viewing key (`uview1...`) da carteira de tesouraria.
- `<birthHeight>`: altura de criação da carteira — acelera muito o 1º scan.

O app **nunca** detém spend keys: a conta é criada como view-only.

## 4. Scan + auditoria

```bash
npm run dev
curl -X POST http://localhost:3000/api/scan
```

As transações — entradas e **saídas de folha** com memo `zacct:` — aparecem em
`/transacoes` e na reconciliação.

## Alternativa sem Docker (engine no Raspberry Pi)

Enquanto a imagem não é buildada, dá para usar o `zkool_graphql` que roda no Pi via um
túnel SSH (a engine fica acessível em `localhost:8000`, igual ao compose):

```bash
ssh -fN -L 8000:127.0.0.1:8000 zebra@192.168.0.28
```
