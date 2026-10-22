import { CONSIGNABLE_MARGIN, installment, round2 } from "@/lib/finance";
import { sleep } from "@/lib/sleep";

export type CedroPayload = {
  documento: string;
  renda_mensal: number;
  valor: number;
  meses: number;
};
export type CedroApi = (payload: CedroPayload, signal: AbortSignal) => Promise<unknown>;

const RATE = 0.021;

export const cedroApi: CedroApi = async (payload, signal) => {
  const roll = Math.random();

  // 10%: o serviço "trava". Só termina quando o timeout do orquestrador cancelar.
  if (roll < 0.1) {
    await sleep(15_000, signal);
    return null;
  }

  await sleep(300 + Math.random() * 900, signal);

  // 10%: erro de servidor.
  if (roll < 0.2) throw new Error("HTTP 503 Service Unavailable");

  // 10%: responde 200, mas com corpo inconsistente.
  if (roll < 0.3) return { codigo: "00", mensagem: "OK", dados: null };

  if (payload.renda_mensal < 1200) {
    return { codigo: "05", mensagem: "Renda abaixo do mínimo do banco", dados: null };
  }

  const value = installment(payload.valor, RATE, payload.meses);
  if (value > payload.renda_mensal * CONSIGNABLE_MARGIN) {
    return { codigo: "05", mensagem: "Cliente sem margem consignável disponível", dados: null };
  }

  return {
    codigo: "00",
    mensagem: "OK",
    dados: {
      valor_liberado: payload.valor,
      taxa_am: `${(RATE * 100).toFixed(2).replace(".", ",")}%`, // "2,10%"
      prazo: payload.meses,
      valor_parcela: round2(value),
    },
  };
};