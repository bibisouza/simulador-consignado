import { describe, it, expect } from "vitest";
import type { SimulationRequest } from "@/domain/simulation";
import { createAuroraProvider } from "./aurora";
import { createBorealProvider } from "./boreal";
import { createCedroProvider } from "./cedro";

const request: SimulationRequest = {
  name: "Beatriz Souza",
  email: "bia@exemplo.com",
  cpf: "52998224725",
  birthDate: "2000-05-10",
  salary: 5000,
  employerCnpj: "11222333000181",
  requestedAmount: 10_000,
  termMonths: 24,
};
const signal = new AbortController().signal;

describe("Aurora", () => {
  it("converte aprovação (taxa em %) para taxa decimal", async () => {
    const provider = createAuroraProvider(async () => ({
      status: "APPROVED",
      valor_aprovado: 9000,
      taxa_mensal: 1.85,
      parcelas: 24,
      valor_parcela: 470.12,
    }));
    await expect(provider.simulate(request, signal)).resolves.toEqual({
      status: "approved",
      bankId: "aurora",
      bankName: "Banco Aurora",
      approvedAmount: 9000,
      monthlyRate: 0.0185,
      termMonths: 24,
      installmentValue: 470.12,
    });
  });

  it("converte reprovação", async () => {
    const provider = createAuroraProvider(async () => ({ status: "DENIED", motivo: "Sem margem" }));
    await expect(provider.simulate(request, signal)).resolves.toMatchObject({
      status: "rejected",
      reason: "Sem margem",
    });
  });

  it("lança BankError se a resposta vier fora do formato", async () => {
    const provider = createAuroraProvider(async () => ({ status: "???" }));
    await expect(provider.simulate(request, signal)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });
});

describe("Boreal", () => {
  it("traduz código de reprovação em mensagem legível", async () => {
    const provider = createBorealProvider(async () => ({
      result: { approved: false, rejection_code: "MARGIN_EXCEEDED" },
    }));
    await expect(provider.simulate(request, signal)).resolves.toMatchObject({
      status: "rejected",
      reason: "Parcela acima da margem consignável",
    });
  });

  it("usa mensagem genérica para código desconhecido", async () => {
    const provider = createBorealProvider(async () => ({
      result: { approved: false, rejection_code: "XYZ" },
    }));
    await expect(provider.simulate(request, signal)).resolves.toMatchObject({
      status: "rejected",
      reason: "Reprovado pelo banco (código XYZ)",
    });
  });
});

describe("Cedro", () => {
  it('interpreta a taxa em texto ("2,10%")', async () => {
    const provider = createCedroProvider(async () => ({
      codigo: "00",
      mensagem: "OK",
      dados: { valor_liberado: 8000, taxa_am: "2,10%", prazo: 24, valor_parcela: 420.5 },
    }));
    await expect(provider.simulate(request, signal)).resolves.toMatchObject({
      status: "approved",
      monthlyRate: 0.021,
    });
  });

  it('trata "00" sem dados como resposta inválida, não como aprovação', async () => {
    const provider = createCedroProvider(async () => ({ codigo: "00", mensagem: "OK", dados: null }));
    await expect(provider.simulate(request, signal)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("não assume reprovação para código desconhecido", async () => {
    const provider = createCedroProvider(async () => ({ codigo: "99", mensagem: "Erro", dados: null }));
    await expect(provider.simulate(request, signal)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("rejeita corpo que não é JSON esperado", async () => {
    const provider = createCedroProvider(async () => null);
    await expect(provider.simulate(request, signal)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });
});