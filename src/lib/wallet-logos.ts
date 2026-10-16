/**
 * Light renditions of wallet marks drawn in ink. The light theme shows the
 * catalog file on a white tile; the dark theme drops that tile and shows the
 * rendition instead, so black marks stay visible. Brand colours are kept.
 */
export const DARK_WALLET_LOGOS: Readonly<Record<string, string>> = {
  "/wallet-logos/zodl.png": "/wallet-logos/dark/zodl.png",
  "/wallet-logos/ywallet.png": "/wallet-logos/dark/ywallet.png",
  "/wallet-logos/zkool.png": "/wallet-logos/dark/zkool.png",
  "/wallet-logos/keystone.png": "/wallet-logos/dark/keystone.png",
  "/wallet-logos/ledger.png": "/wallet-logos/dark/ledger.png",
  "/wallet-logos/trezor.png": "/wallet-logos/dark/trezor.png",
};

/** The dark-theme rendition for a wallet logo path, ignoring any cache key in its query. */
export function darkWalletLogo(src: string): string | undefined {
  return DARK_WALLET_LOGOS[src.split("?")[0]];
}
