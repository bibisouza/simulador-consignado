import { describe, it, expect, vi } from "vitest";
import { BankError } from "@/banks/errors";
import type { BankDecision, BankProvider } from "@/banks/types";
import type { SimulationRequest } from "@/domain/simulation";
import { summarize } from "@/domain/simulation-outcome";
import { silentLogger } from "@/lib/logger";
import { sleep } from "@/lib/sleep";
import { runSimulation } from "./simulation";

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

const fast = { timeoutMs: 50, maxAttempts: 2, retryDelayMs: 1, logger: silentLogger };

const approved = (id: string, monthlyRate = 0.02): BankDecision => ({
  status: "approved",
  bankId: id,
  bankName: `Banco ${id}`,
  approvedAmount: 10_000,
  monthlyRate,
  termMonths: 24,
  installmentValue: 500,
});

const makeProvider = (id: string, simulate: BankProvider["simulate"]): BankProvider => ({
  id,
  name: `Banco ${id}`,
  simulate,
});

describe("runSimulation", () => {
  it("consolida os resultados na ordem dos bancos e isola falhas", async () => {
    const outcome = await runSimulation(request, {
      ...fast,
      providers: [
        makeProvider("a", async () => approved("a")),
        makeProvider("b", async () => ({
          status: "rejected",
          bankId: "b",
          bankName: "Banco b",
          reason: "Sem margem",
        })),
        makeProvider("c", async () => {
          throw new BankError("invalid_response", "formato errado");
        }),
      ],
    });

    expect(outcome.results.map((r) => r.status)).toEqual(["approved", "rejected", "unavailable"]);
    expect(outcome.summary).toMatchObject({ approved: 1, rejected: 1, unavailable: 1 });
  });

  it("consulta os bancos em paralelo", async () => {
    let markBStarted: () => void = () => {};
    const bStarted = new Promise<void>((resolve) => (markBStarted = resolve));

    // Se fosse sequencial, A ficaria esperando B começar e estouraria o timeout.
    const outcome = await runSimulation(request, {
      ...fast,
      providers: [
        makeProvider("a", async () => {
          await bStarted;
          return approved("a");
        }),
        makeProvider("b", async () => {
          markBStarted();
          return approved("b");
        }),
      ],
    });

    expect(outcome.results.map((r) => r.status)).toEqual(["approved", "approved"]);
  });

  it("transforma timeout em unavailable e cancela a chamada", async () => {
    let captured: AbortSignal | undefined;
    const hanging = makeProvider("a", async (_req, signal) => {
      captured = signal;
      await sleep(10_000, signal);
      return approved("a");
    });

    const outcome = await runSimulation(request, { ...fast, maxAttempts: 1, providers: [hanging] });

    expect(outcome.results[0]).toMatchObject({ status: "unavailable", cause: "timeout" });
    expect(captured?.aborted).toBe(true);
  });

  it("tenta de novo após erro de rede e aceita a segunda tentativa", async () => {
    const simulate = vi
      .fn<BankProvider["simulate"]>()
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockResolvedValueOnce(approved("a"));

    const outcome = await runSimulation(request, { ...fast, providers: [makeProvider("a", simulate)] });

    expect(simulate).toHaveBeenCalledTimes(2);
    expect(outcome.results.map((r) => r.status)).toEqual(["approved"]);
  });

  it("desiste depois do número máximo de tentativas", async () => {
    const simulate = vi.fn<BankProvider["simulate"]>().mockRejectedValue(new Error("HTTP 503"));

    const outcome = await runSimulation(request, { ...fast, providers: [makeProvider("a", simulate)] });

    expect(simulate).toHaveBeenCalledTimes(2);
    expect(outcome.results[0]).toMatchObject({ status: "unavailable", cause: "network_error" });
  });

  it("não repete quando a resposta é inválida", async () => {
    const simulate = vi
      .fn<BankProvider["simulate"]>()
      .mockRejectedValue(new BankError("invalid_response", "formato errado"));

    const outcome = await runSimulation(request, { ...fast, providers: [makeProvider("a", simulate)] });

    expect(simulate).toHaveBeenCalledTimes(1);
    expect(outcome.results[0]).toMatchObject({ status: "unavailable", cause: "invalid_response" });
  });

  it("não vaza detalhes técnicos para o cliente", async () => {
    const provider = makeProvider("a", async () => {
      throw new TypeError("Cannot read properties of undefined (reading 'x')");
    });

    const outcome = await runSimulation(request, { ...fast, providers: [provider] });
    const result = outcome.results[0];

    expect(result).toMatchObject({ status: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("Cannot read");
  });

  it("avisa cada banco assim que ele responde", async () => {
    const onBankResult = vi.fn();
    await runSimulation(request, {
      ...fast,
      onBankResult,
      providers: [
        makeProvider("a", async () => approved("a")),
        makeProvider("b", async () => approved("b")),
      ],
    });
    expect(onBankResult).toHaveBeenCalledTimes(2);
  });
});

describe("summarize", () => {
  it("escolhe a menor taxa como melhor oferta", () => {
    const summary = summarize([approved("a", 0.0199), approved("b", 0.0185), approved("c", 0.021)]);
    expect(summary.bestOfferBankId).toBe("b");
  });

  it("não indica melhor oferta quando ninguém aprovou", () => {
    const summary = summarize([
      { status: "rejected", bankId: "a", bankName: "A", reason: "x" },
      { status: "unavailable", bankId: "b", bankName: "B", cause: "timeout", message: "x" },
    ]);
    expect(summary.bestOfferBankId).toBeNull();
  });
});