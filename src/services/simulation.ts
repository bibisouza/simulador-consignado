import { randomUUID } from "node:crypto";
import { defaultProviders } from "@/banks";
import { BankError } from "@/banks/errors";
import type { BankDecision, BankProvider } from "@/banks/types";
import type { BankResult, UnavailableCause } from "@/domain/bank-result";
import type { SimulationRequest } from "@/domain/simulation";
import { summarize, type SimulationOutcome } from "@/domain/simulation-outcome";
import { consoleLogger, type Logger } from "@/lib/logger";
import { sleep } from "@/lib/sleep";

export type SimulationOptions = {
  providers?: BankProvider[];
  /** Tempo máximo de CADA tentativa. */
  timeoutMs?: number;
  /** Total de tentativas (1 = sem retry). */
  maxAttempts?: number;
  retryDelayMs?: number;
  logger?: Logger;
  /** Chamado logo no início, com a lista de bancos que serão consultados. */
  onStart?: (info: { simulationId: string; banks: { id: string; name: string }[] }) => void;
  /** Chamado assim que cada banco responde (base para mostrar resultados em tempo real). */
  onBankResult?: (result: BankResult) => void;
};

/** Só repetimos o que pode ser passageiro. Resposta inválida não costuma se resolver sozinha. */
const RETRYABLE: ReadonlySet<UnavailableCause> = new Set(["timeout", "network_error"]);

/** Mensagens para o cliente. O detalhe técnico vai só para o log. */
const USER_MESSAGES: Record<UnavailableCause, string> = {
  timeout: "O banco demorou demais para responder.",
  network_error: "Não conseguimos falar com o banco agora.",
  invalid_response: "O banco respondeu algo que não conseguimos interpretar.",
};

function toBankError(err: unknown): BankError {
  if (err instanceof BankError) return err;
  return new BankError("network_error", err instanceof Error ? err.message : "Erro desconhecido");
}

/** Uma tentativa, com prazo. Cancela a chamada se estourar. */
async function attemptOnce(
  provider: BankProvider,
  request: SimulationRequest,
  timeoutMs: number,
): Promise<BankDecision> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new BankError("timeout", `Sem resposta em ${timeoutMs} ms`);
      controller.abort(error); // avisa o provider para parar
      reject(error); // garante o prazo mesmo se o provider ignorar o signal
    }, timeoutMs);
  });

  try {
    return await Promise.race([provider.simulate(request, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

type Context = Required<
  Pick<SimulationOptions, "timeoutMs" | "maxAttempts" | "retryDelayMs" | "logger">
> & {
  simulationId: string;
};

/** Consulta um banco com retry. NUNCA rejeita: sempre devolve um BankResult. */
async function consultBank(
  provider: BankProvider,
  request: SimulationRequest,
  ctx: Context,
): Promise<BankResult> {
  const startedAt = Date.now();
  let lastError = new BankError("network_error", "Nenhuma tentativa realizada");

  for (let attempt = 1; attempt <= ctx.maxAttempts; attempt++) {
    try {
      const decision = await attemptOnce(provider, request, ctx.timeoutMs);
      ctx.logger.info("bank.responded", {
        simulationId: ctx.simulationId,
        bankId: provider.id,
        status: decision.status,
        attempt,
        durationMs: Date.now() - startedAt,
      });
      return decision;
    } catch (err) {
      lastError = toBankError(err);
      ctx.logger.warn("bank.attempt_failed", {
        simulationId: ctx.simulationId,
        bankId: provider.id,
        attempt,
        cause: lastError.kind,
        detail: lastError.message,
        durationMs: Date.now() - startedAt,
      });

      const canRetry = RETRYABLE.has(lastError.kind) && attempt < ctx.maxAttempts;
      if (!canRetry) break;
      await sleep(ctx.retryDelayMs);
    }
  }

  return {
    status: "unavailable",
    bankId: provider.id,
    bankName: provider.name,
    cause: lastError.kind,
    message: USER_MESSAGES[lastError.kind],
  };
}

export async function runSimulation(
  request: SimulationRequest,
  options: SimulationOptions = {},
): Promise<SimulationOutcome> {
  const {
    providers = defaultProviders,
    timeoutMs = 3000,
    maxAttempts = 2,
    retryDelayMs = 200,
    logger = consoleLogger,
    onStart,
    onBankResult,
  } = options;

  const simulationId = randomUUID();
  const ctx: Context = {
    simulationId,
    timeoutMs,
    maxAttempts: Math.max(1, maxAttempts),
    retryDelayMs,
    logger,
  };

  logger.info("simulation.started", { simulationId, banks: providers.length });

  try {
    onStart?.({
      simulationId,
      banks: providers.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch {
    logger.warn("simulation.callback_failed", { simulationId });
  }

  // Cada consultBank trata as próprias falhas, então um banco ruim não derruba os outros.
  const results = await Promise.all(
    providers.map(async (provider) => {
      const result = await consultBank(provider, request, ctx);
      try {
        onBankResult?.(result);
      } catch {
        logger.warn("simulation.callback_failed", { simulationId });
      }
      return result;
    }),
  );

  const summary = summarize(results);
  logger.info("simulation.finished", { simulationId, ...summary });

  return { simulationId, results, summary };
}