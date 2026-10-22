import { z } from "zod";
import { BankError } from "./errors";
import { borealApi, type BorealApi } from "./fakes/boreal-api";
import type { BankProvider } from "./types";

const responseSchema = z.object({
  result: z.discriminatedUnion("approved", [
    z.object({
      approved: z.literal(true),
      offer: z.object({
        amount: z.number().positive(),
        monthly_rate: z.number().positive(),
        installment: z.object({
          count: z.number().int().positive(),
          value: z.number().positive(),
        }),
      }),
    }),
    z.object({ approved: z.literal(false), rejection_code: z.string() }),
  ]),
});

const REJECTION_MESSAGES: Record<string, string> = {
  MARGIN_EXCEEDED: "Parcela acima da margem consignável",
  AMOUNT_ABOVE_LIMIT: "Valor solicitado acima do limite do banco",
};

export function createBorealProvider(api: BorealApi = borealApi): BankProvider {
  const base = { bankId: "boreal", bankName: "Banco Boreal" };

  return {
    id: base.bankId,
    name: base.bankName,
    async simulate(request, signal) {
      const raw = await api(
        {
          customer: { document: request.cpf },
          income: request.salary,
          requested: { amount: request.requestedAmount, months: request.termMonths },
        },
        signal,
      );

      const parsed = responseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new BankError("invalid_response", "Resposta fora do formato esperado");
      }

      const { result } = parsed.data;
      if (!result.approved) {
        return {
          status: "rejected",
          ...base,
          reason:
            REJECTION_MESSAGES[result.rejection_code] ??
            `Reprovado pelo banco (código ${result.rejection_code})`,
        };
      }
      return {
        status: "approved",
        ...base,
        approvedAmount: result.offer.amount,
        monthlyRate: result.offer.monthly_rate,
        termMonths: result.offer.installment.count,
        installmentValue: result.offer.installment.value,
      };
    },
  };
}