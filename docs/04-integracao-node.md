# Integração com o node real (Zebra + zallet)

> Estado: a stack do app está pronta para o node real; o RPC do `NODE_HOST` **não está acessível pela LAN** ainda. Enquanto isso, o app roda com `ZCASH_GATEWAY=mock` + Postgres.

## Como ligar o gateway real

1. **Expor o RPC na LAN** (hoje provavelmente bindado em `127.0.0.1` no `.28`):
   - **Zebra** (`zebrad.toml`): `[rpc] listen_addr = '0.0.0.0:8232'`. Auth: o Zebra usa **cookie-auth por padrão** (≥ v2.0.0). Para acesso simples na LAN, `enable_cookie_auth = false` e proteja por firewall; ou copie o cookie de `~/.cache/zebra/.cookie`.
   - **zallet** (`zallet.toml`): `[rpc] bind = ["0.0.0.0:PORTA"]` (não há porta default — escolha uma, ex. 28232). Auth **HTTP Basic**: `[[rpc.auth]] user = "..."` + `password`/`pwhash` (gere com `zallet rpc add-user`). A conexão zallet→Zebra fica em `[indexer]`.
2. **Preencher `.env.local`** com a porta/credenciais corretas do zallet e mudar `ZCASH_GATEWAY=real`.
3. **Validar**: `npm run probe` (sonda Zebra + zallet sem subir o Next) e/ou `GET /api/health`.
4. **Escanear**: `POST /api/scan` persiste no Postgres.

## ⚠️ Achado importante sobre o zallet (alpha v0.1.0-alpha.3)

O zallet **ainda não importa viewing key / UFVK via RPC** (sem `z_importviewingkey`). Consequência para o nosso design:

- A "auditoria read-only por **viewing key pura**" (zallet só com a UFVK, sem seed) **não é suportada hoje**.
- O caminho que funciona agora: o zallet já tem a(s) **conta(s)** da empresa (criadas via seed ou `z_recoveraccounts`), e o nosso sistema **só lê** via `z_listtransactions` / `z_listaccounts` / `z_getbalances`. O nosso app continua read-only (nunca chama `z_sendmany`), mas as spend keys vivem no zallet (infra da empresa), não no nosso app.
- Para viewing-key pura, alternativas futuras: lightwalletd + lib cliente que aceite UFVK, ou aguardar o zallet sair do alpha.

## Mapeamento a validar

`src/lib/zcash/real/zallet-gateway.ts` mapeia `z_listtransactions` (formato legado zcashd) para o nosso `ChainTx`/`ChainOutput`. O zallet é alpha — ao conectar, confira o shape real (`rpc.discover` / `help`) e ajuste o parser. Ele lança erro instrutivo se o formato divergir.

## Fontes

Zallet Book `zcash.github.io/wallet` · Zebra Book `zebra.zfnd.org` · `docs.rs/zebra-rpc` · repo `github.com/zcash/wallet`.
