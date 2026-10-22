import type { BankResult } from "./bank-result";

export type SimulationOutcome = {
  simulationId: string;
  results: BankResult[];
  summary: {
    approved: number;
    rejected: number;
    unavailable: number;
    /** Aprovação com menor taxa mensal (desempate: maior valor liberado). */
    bestOfferBankId: string | null;
  };
};

type Approved = Extract<BankResult, { status: "approved" }>;

export function summarize(results: BankResult[]): SimulationOutcome["summary"] {
  const approved = results.filter((r): r is Approved => r.status === "approved");
  const best = [...approved].sort(
    (a, b) => a.monthlyRate - b.monthlyRate || b.approvedAmount - a.approvedAmount,
  )[0];

  return {
    approved: approved.length,
    rejected: results.filter((r) => r.status === "rejected").length,
    unavailable: results.filter((r) => r.status === "unavailable").length,
    bestOfferBankId: best?.bankId ?? null,
  };
}