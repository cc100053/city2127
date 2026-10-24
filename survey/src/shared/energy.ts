/** Independent resident energy preferences; shares describe a display, never electrical capacity. */
export const ENERGY_CHOICES = ['water-storage', 'rotor-storage', 'orbital-supply', 'island-supply'] as const;
export type EnergyChoice = typeof ENERGY_CHOICES[number];
export type EnergyConfiguration = {
  waterGardens: 0 | 1 | 2;
  receiver: 'none' | 'small' | 'large';
  flywheel: boolean;
  island: boolean;
};
export type EnergyState = { climateGuestCount: number; counts: Record<EnergyChoice, number> };
export const emptyEnergyConfiguration = (): EnergyConfiguration => ({ waterGardens: 0, receiver: 'none', flywheel: false, island: false });
export const emptyEnergyCounts = (): EnergyState['counts'] => ({ 'water-storage': 0, 'rotor-storage': 0, 'orbital-supply': 0, 'island-supply': 0 });
export const isEnergyChoice = (value: unknown): value is EnergyChoice => typeof value === 'string' && ENERGY_CHOICES.includes(value as EnergyChoice);
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: readonly string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
export function isEnergyConfiguration(v: unknown): v is EnergyConfiguration {
  return record(v) && keys(v, ['waterGardens', 'receiver', 'flywheel', 'island'])
    && [0, 1, 2].includes(v.waterGardens as number) && ['none', 'small', 'large'].includes(v.receiver as string)
    && typeof v.flywheel === 'boolean' && typeof v.island === 'boolean';
}
export function isEnergyState(v: unknown, guestCount: number): v is EnergyState {
  if (!record(v) || !keys(v, ['climateGuestCount', 'counts']) || !Number.isSafeInteger(v.climateGuestCount)
      || (v.climateGuestCount as number) < 0 || !record(v.counts) || !keys(v.counts, ENERGY_CHOICES)) return false;
  const counts = v.counts;
  return ENERGY_CHOICES.every(k => Number.isSafeInteger(counts[k]) && (counts[k] as number) >= 0)
    && ENERGY_CHOICES.reduce((n, k) => n + (counts[k] as number), 0) === guestCount - (v.climateGuestCount as number);
}
export function energyConfiguration(counts: EnergyState['counts']): EnergyConfiguration {
  const total = ENERGY_CHOICES.reduce((n, k) => n + counts[k], 0) + 4;
  // Integer comparisons keep exact 20% / 40% boundaries stable.
  const enabled = (k: EnergyChoice) => counts[k] >= 2 && counts[k] * 5 >= total;
  return {
    waterGardens: enabled('water-storage') ? counts['water-storage'] * 5 >= total * 2 ? 2 : 1 : 0,
    receiver: enabled('orbital-supply') ? counts['orbital-supply'] * 5 >= total * 2 ? 'large' : 'small' : 'none',
    flywheel: enabled('rotor-storage'), island: enabled('island-supply'),
  };
}

export function sameEnergyConfiguration(a: EnergyConfiguration, b: EnergyConfiguration): boolean {
  return a.waterGardens === b.waterGardens && a.receiver === b.receiver && a.flywheel === b.flywheel && a.island === b.island;
}
