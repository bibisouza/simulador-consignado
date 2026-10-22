import type { BankResult } from "@/domain/bank-result";
import type { SimulationRequest } from "@/domain/simulation";

export type BankDecision = Exclude<BankResult, { status: "unavailable" }>;

export interface BankProvider {
  readonly id: string;
  readonly name: string;

  simulate(request: SimulationRequest, signal: AbortSignal): Promise<BankDecision>;
}