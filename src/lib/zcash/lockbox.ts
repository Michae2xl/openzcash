/**
 * Zcash deferred Dev Fund ("Lockbox") accrual — protocol-deterministic.
 *
 * Since NU6 (the 2nd halving, block 2,726,400, mined 2024-11-23) 12% of every
 * block's 1.5625 ZEC subsidy — 0.1875 ZEC — accrues to the in-protocol Lockbox,
 * 8% (0.125 ZEC) funds ZCG grants via the FPF, and the remaining 80% (1.25 ZEC)
 * goes to the miner. NU6.1 (block 3,146,400) kept the 12% accruing, now under
 * coinholder control, through to the 3rd halving.
 *
 * Sources: ZIP-1015 (block subsidy allocation), ZIP-1016 (coinholder funding),
 * ZIP-2001 (lockbox funding streams).
 */
export const LOCKBOX_START_HEIGHT = 2_726_400; // NU6 / 2nd halving
export const THIRD_HALVING_HEIGHT = 4_406_400; // funding model end (approx)
export const BLOCK_SUBSIDY_ZEC = 1.5625; // post-2024-halving subsidy
export const LOCKBOX_ZEC_PER_BLOCK = 0.1875; // 12% of the subsidy
export const ZCG_ZEC_PER_BLOCK = 0.125; // 8% of the subsidy (ZCG/FPF)
export const MINER_ZEC_PER_BLOCK = 1.25; // 80% of the subsidy
export const BLOCKS_PER_DAY = 1152; // ~75s target block time

/** ZEC accrued to the Lockbox up to (and including) the given block height. */
export function lockboxZecAt(height: number): number {
  const end = Math.min(height, THIRD_HALVING_HEIGHT);
  const blocks = Math.max(0, end - LOCKBOX_START_HEIGHT);
  return blocks * LOCKBOX_ZEC_PER_BLOCK;
}
