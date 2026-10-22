import type { BankResult } from "@/domain/bank-result";
import type { SimulationOutcome } from "@/domain/simulation-outcome";
import { formatBRL, formatRate } from "@/lib/format";

type CardProps = { result: BankResult; isBest: boolean; requestedAmount: number };

function BankCard({ result, isBest, requestedAmount }: CardProps) {
  switch (result.status) {
    case "approved": {
      const total = result.installmentValue * result.termMonths;
      return (
        <article className="card card--approved">
          <header>
            <h3>{result.bankName}</h3>
            <span className="badge badge--ok">{isBest ? "Melhor oferta" : "Aprovado"}</span>
          </header>
          <p className="big">{formatBRL(result.approvedAmount)}</p>
          {result.approvedAmount < requestedAmount && (
            <p className="note">
              Valor menor que o solicitado ({formatBRL(requestedAmount)}): é o máximo que cabe na sua
              margem.
            </p>
          )}
          <dl>
            <dt>Parcelas</dt>
            <dd>
              {result.termMonths}x de {formatBRL(result.installmentValue)}
            </dd>
            <dt>Taxa</dt>
            <dd>{formatRate(result.monthlyRate)}</dd>
            <dt>Total a pagar</dt>
            <dd>{formatBRL(total)}</dd>
          </dl>
        </article>
      );
    }
    case "rejected":
      return (
        <article className="card card--rejected">
          <header>
            <h3>{result.bankName}</h3>
            <span className="badge badge--bad">Reprovado</span>
          </header>
          <p>{result.reason}</p>
        </article>
      );
    case "unavailable":
      return (
        <article className="card card--unavailable">
          <header>
            <h3>{result.bankName}</h3>
            <span className="badge badge--warn">Indisponível</span>
          </header>
          <p>{result.message}</p>
          <p className="note">Isso não é uma recusa: o banco não chegou a avaliar seu pedido.</p>
        </article>
      );
  }
}

export function Results({
  outcome,
  requestedAmount,
}: {
  outcome: SimulationOutcome;
  requestedAmount: number;
}) {
  const { results, summary } = outcome;
  return (
    <section className="results" aria-live="polite">
      <h2>Resultado da simulação</h2>
      <p className="summary">
        Aprovadas: {summary.approved} · Reprovadas: {summary.rejected} · Indisponíveis:{" "}
        {summary.unavailable}
      </p>
      <div className="cards">
        {results.map((result) => (
          <BankCard
            key={result.bankId}
            result={result}
            isBest={result.bankId === summary.bestOfferBankId}
            requestedAmount={requestedAmount}
          />
        ))}
      </div>
      {summary.unavailable > 0 && (
        <p className="note">
          Algum banco não respondeu. Você pode simular novamente para tentar consultá-lo outra vez.
        </p>
      )}
    </section>
  );
}