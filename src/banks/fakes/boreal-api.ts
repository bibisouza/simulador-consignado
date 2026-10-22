import { CONSIGNABLE_MARGIN, installment, round2 } from "@/lib/finance";
import { sleep } from "@/lib/sleep";

export type BorealPayload = {
  customer: { document: string };
  income: number;
  requested: { amount: number; months: number };
};
export type BorealApi = (payload: BorealPayload, signal: AbortSignal) => Promise<unknown>;

const RATE = 0.0199;

export const borealApi: BorealApi = async (payload, signal) => {
  await sleep(1200 + Math.random() * 1300, signal);

  const { amount, months } = payload.requested;
  if (amount > 80_000) {
    return { result: { approved: false, rejection_code: "AMOUNT_ABOVE_LIMIT" } };
  }

  const value = installment(amount, RATE, months);
  if (value > payload.income * CONSIGNABLE_MARGIN) {
    return { result: { approved: false, rejection_code: "MARGIN_EXCEEDED" } };
  }

  return {
    result: {
      approved: true,
      offer: {
        amount,
        monthly_rate: RATE,
        installment: { count: months, value: round2(value) },
      },
    },
  };
};