import { z } from "zod";
import { percentToRate } from "@/lib/finance";
import { BankError } from "./errors";
import { auroraApi, type AuroraApi } from "./fakes/aurora-api";
import type { BankProvider } from "./types";

const responseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("APPROVED"),
    valor_aprovado: z.number().positive(),
    taxa_mensal: z.number().positive(),
    parcelas: z.number().int().positive(),
    valor_parcela: z.number().positive(),
  }),
  z.object({ status: z.literal("DENIED"), motivo: z.string() }),
]);

export function createAuroraProvider(api: AuroraApi = auroraApi): BankProvider {
  const base = { bankId: "aurora", bankName: "Banco Aurora" };

  return {
    id: base.bankId,
    name: base.bankName,
    async simulate(request, signal) {
      const raw = await api(
        {
          cpf: request.cpf,
          salario: request.salary,
          valor_solicitado: request.requestedAmount,
          prazo: request.termMonths,
        },
        signal,
      );

      const parsed = responseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new BankError("invalid_response", "Resposta fora do formato esperado");
      }

      const data = parsed.data;
      if (data.status === "DENIED") {
        return { status: "rejected", ...base, reason: data.motivo };
      }
      return {
        status: "approved",
        ...base,
        approvedAmount: data.valor_aprovado,
        monthlyRate: percentToRate(data.taxa_mensal),
        termMonths: data.parcelas,
        installmentValue: data.valor_parcela,
      };
    },
  };
}