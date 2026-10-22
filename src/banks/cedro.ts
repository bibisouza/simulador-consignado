import { z } from "zod";
import { percentToRate } from "@/lib/finance";
import { BankError } from "./errors";
import { cedroApi, type CedroApi } from "./fakes/cedro-api";
import type { BankProvider } from "./types";

const responseSchema = z.object({
  codigo: z.string(),
  mensagem: z.string(),
  dados: z
    .object({
      valor_liberado: z.number().positive(),
      taxa_am: z.string().regex(/^\d+(,\d+)?%$/),
      prazo: z.number().int().positive(),
      valor_parcela: z.number().positive(),
    })
    .nullable(),
});

export function createCedroProvider(api: CedroApi = cedroApi): BankProvider {
  const base = { bankId: "cedro", bankName: "Banco Cedro" };

  return {
    id: base.bankId,
    name: base.bankName,
    async simulate(request, signal) {
      const raw = await api(
        {
          documento: request.cpf,
          renda_mensal: request.salary,
          valor: request.requestedAmount,
          meses: request.termMonths,
        },
        signal,
      );

      const parsed = responseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new BankError("invalid_response", "Resposta fora do formato esperado");
      }

      const { codigo, mensagem, dados } = parsed.data;

      if (codigo === "05") {
        return { status: "rejected", ...base, reason: mensagem };
      }
      if (codigo === "00" && dados) {
        const pct = parseFloat(dados.taxa_am.replace("%", "").replace(",", "."));
        return {
          status: "approved",
          ...base,
          approvedAmount: dados.valor_liberado,
          monthlyRate: percentToRate(pct),
          termMonths: dados.prazo,
          installmentValue: dados.valor_parcela,
        };
      }

      // Código desconhecido (ou "00" sem dados): não dá pra assumir aprovado nem reprovado.
      throw new BankError("invalid_response", `Retorno inesperado do banco (código ${codigo})`);
    },
  };
}