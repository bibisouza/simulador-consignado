import { describe, it, expect } from "vitest";
import { installment, maxPrincipal, percentToRate } from "./finance";

describe("finance", () => {
  it("calcula a parcela pela Tabela Price", () => {
    expect(installment(10_000, 0.02, 12)).toBeCloseTo(945.6, 1);
  });

  it("maxPrincipal é o inverso de installment", () => {
    const pmt = installment(10_000, 0.0185, 24);
    expect(maxPrincipal(pmt, 0.0185, 24)).toBeCloseTo(10_000, 4);
  });

  it("converte percentual em taxa sem ruído", () => {
    expect(percentToRate(1.85)).toBe(0.0185);
    expect(percentToRate(2.1)).toBe(0.021);
  });
});