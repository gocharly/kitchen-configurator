export const CURRENCY_CODE = 'KZT';
export const TENGE_PER_RUBLE = 5.52;
export const PRICE_STEP_TENGE = 100;

export function rublesToTenge(rubles: number): number {
  return Math.round((rubles * TENGE_PER_RUBLE) / PRICE_STEP_TENGE) * PRICE_STEP_TENGE;
}
