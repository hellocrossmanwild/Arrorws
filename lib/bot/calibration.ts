/**
 * Calibrated throw-scatter values, produced by `pnpm bot:calibrate`
 * (scripts/calibrate-bot.ts). Do not hand-tune — re-run the script if the
 * geometry or strategy ever changes.
 *
 * Measured over 10,000 simulated legs per profile:
 *   Pub player  avg 45.04 (target 45),  checkout 10.2% (band 8-12)
 *   County      avg 74.70 (target 75),  checkout 26.5% (band 25-30)
 *   Tour card   avg 95.20 (target 95),  checkout 39.8% (band 38-45)
 *   Elite       avg 104.89 (target 105), checkout 46.3% (band 45-50)
 */
export const CALIBRATED_SIGMAS: Record<
  string,
  { scoringSigmaMm: number; doubleSigmaMm: number }
> = {
  pub: { scoringSigmaMm: 14.92, doubleSigmaMm: 23.18 },
  county: { scoringSigmaMm: 9.3, doubleSigmaMm: 11.13 },
  "tour-card": { scoringSigmaMm: 6.55, doubleSigmaMm: 7.25 },
  elite: { scoringSigmaMm: 5.47, doubleSigmaMm: 6.32 },
}
