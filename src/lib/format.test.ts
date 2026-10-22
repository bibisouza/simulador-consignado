import { describe, it, expect } from "vitest";
import { formatCnpjInput, formatCpfInput } from "./format";

describe("máscaras", () => {
  it("formata CPF progressivamente", () => {
    expect(formatCpfInput("5299")).toBe("529.9");
    expect(formatCpfInput("52998224725")).toBe("529.982.247-25");
    expect(formatCpfInput("529.982.247-25999")).toBe("529.982.247-25");
  });

  it("formata CNPJ numérico e alfanumérico", () => {
    expect(formatCnpjInput("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatCnpjInput("12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });
});