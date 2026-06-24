# zkool_graphql — engine de wallet Zcash (watch-only por UFVK) via GraphQL.
# Fonte: github.com/hhanh00/zkool2 (licença MIT). Compila do source e roda um
# binário slim que conecta a um lightwalletd público (sem full node próprio).
#
# ⚠️ A 1ª build é PESADA (~15-20 min, baixa os crates Zcash e compila em release).
# Para reprodutibilidade, fixe ZKOOL_REF numa tag/commit (ex.: --build-arg ZKOOL_REF=v6.21.0).

# ── build: compila o zkool_graphql ──
FROM rust:1-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends \
      git clang cmake pkg-config libssl-dev protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*
ARG ZKOOL_REF=main
WORKDIR /src
RUN git clone https://github.com/hhanh00/zkool2.git . && git checkout "${ZKOOL_REF}"
WORKDIR /src/rust
RUN cargo build --release --bin zkool_graphql

# ── runtime: imagem slim só com o binário ──
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /src/rust/target/release/zkool_graphql /usr/local/bin/zkool_graphql
WORKDIR /data
EXPOSE 8000
# DB SQLite em volume, lwd público mainnet, GraphQL em :8000 (endpoint /graphql).
ENTRYPOINT ["zkool_graphql"]
CMD ["-d", "/data/zkool.db", "-l", "https://zec.rocks", "-p", "8000"]
