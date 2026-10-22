import type { UnavailableCause } from "@/domain/bank-result";

export class BankError extends Error {
  constructor(
    readonly kind: UnavailableCause,
    message: string,
  ) {
    super(message);
    this.name = "BankError";
  }
}