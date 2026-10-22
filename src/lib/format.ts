import { normalizeCnpj, onlyDigits } from "./document";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatBRL = (value: number): string => brl.format(value);

/** 0.0185 -> "1,85% a.m." */
export const formatRate = (monthlyRate: number): string =>
  `${(monthlyRate * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}% a.m.`;

/** Máscara progressiva enquanto a pessoa digita: 000.000.000-00 */
export function formatCpfInput(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  const head = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(".");
  return d.length > 9 ? `${head}-${d.slice(9)}` : head;
}

/** Máscara progressiva: XX.XXX.XXX/XXXX-XX (aceita letras, como o CNPJ alfanumérico). */
export function formatCnpjInput(value: string): string {
  const c = normalizeCnpj(value).slice(0, 14);
  let out = c.slice(0, 2);
  if (c.length > 2) out += `.${c.slice(2, 5)}`;
  if (c.length > 5) out += `.${c.slice(5, 8)}`;
  if (c.length > 8) out += `/${c.slice(8, 12)}`;
  if (c.length > 12) out += `-${c.slice(12)}`;
  return out;
}