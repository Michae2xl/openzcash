/** Cifra uma string (UFVK) no navegador com a chave pública do backend (sealed-box). */
export async function sealUfvk(
  value: string,
  pubKeyB64: string,
): Promise<string> {
  const sodium = (await import("libsodium-wrappers")).default;
  await sodium.ready;
  const v = sodium.base64_variants.ORIGINAL;
  return sodium.to_base64(
    sodium.crypto_box_seal(
      sodium.from_string(value),
      sodium.from_base64(pubKeyB64, v),
    ),
    v,
  );
}
