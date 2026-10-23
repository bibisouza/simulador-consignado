import type { BankResult } from "./bank-result";
import type { SimulationOutcome } from "./simulation-outcome";

export type StreamEvent =
  | { type: "started"; simulationId: string; banks: { id: string; name: string }[] }
  | { type: "bank"; result: BankResult }
  | { type: "done"; outcome: SimulationOutcome };