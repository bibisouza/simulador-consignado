import { describe, it, expect } from "vitest";
import { isValidCpf, isValidCnpj, maskCpf } from "./document";

describe("isValidCpf", () => {
  it("aceita CPF válido, com ou sem pontuação", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
  });

  it("rejeita sequências repetidas", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("rejeita tamanho errado e texto", () => {
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("abc")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });
});

describe("isValidCnpj", () => {
  it("aceita CNPJ numérico válido", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
  });

  it("aceita CNPJ alfanumérico válido", () => {
    expect(isValidCnpj("12.ABC.345/01DE-35")).toBe(true);
    expect(isValidCnpj("12abc34501de35")).toBe(true);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita sequências repetidas e tamanho errado", () => {
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(isValidCnpj("123")).toBe(false);
  });
});

describe("maskCpf", () => {
  it("esconde todos os dígitos menos os 2 últimos", () => {
    expect(maskCpf("529.982.247-25")).toBe("***.***.***-25");
  });

  it("não vaza nada se o CPF for inválido", () => {
    expect(maskCpf("123")).toBe("***");
  });
});