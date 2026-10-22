export const CONSIGNABLE_MARGIN = 0.35;

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const percentToRate = (pct: number): number => Math.round(pct * 100) / 10000;

export function installment(principal: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

export function maxPrincipal(maxInstallment: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return maxInstallment * months;
  return (maxInstallment * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate;
}