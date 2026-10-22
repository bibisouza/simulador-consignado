import { CONSIGNABLE_MARGIN, installment, maxPrincipal, round2 } from "@/lib/finance";
import { sleep } from "@/lib/sleep";

export type AuroraPayload = {
  cpf: string;
  salario: number;
  valor_solicitado: number;
  prazo: number;
};
export type AuroraApi = (payload: AuroraPayload, signal: AbortSignal) => Promise<unknown>;

const RATE_PCT = 1.85;

export const auroraApi: AuroraApi = async (payload, signal) => {
  await sleep(150 + Math.random() * 350, signal);

  if (payload.salario < 1500) {
    return { status: "DENIED", motivo: "Renda abaixo do mínimo exigido" };
  }

  const rate = RATE_PCT / 100;
  const margin = payload.salario * CONSIGNABLE_MARGIN;
  const wanted = installment(payload.valor_solicitado, rate, payload.prazo);

  if (wanted <= margin) {
    return {
      status: "APPROVED",
      valor_aprovado: payload.valor_solicitado,
      taxa_mensal: RATE_PCT,
      parcelas: payload.prazo,
      valor_parcela: round2(wanted),
    };
  }

  // Contraproposta: aprova só o que cabe na margem.
  const reduced = Math.floor(maxPrincipal(margin, rate, payload.prazo));
  if (reduced < 500) {
    return { status: "DENIED", motivo: "Margem consignável insuficiente" };
  }
  return {
    status: "APPROVED",
    valor_aprovado: reduced,
    taxa_mensal: RATE_PCT,
    parcelas: payload.prazo,
    valor_parcela: round2(installment(reduced, rate, payload.prazo)),
  };
};