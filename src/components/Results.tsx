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

function PendingCard({ name }: { name: string }) {
  return (
    <article className="card card--pending" aria-busy="true">
      <header>
        <h3>{name}</h3>
        <span className="badge badge--pending">Consultando…</span>
      </header>
      <div className="skeleton" />
      <div className="skeleton skeleton--short" />
    </article>
  );
}

type ResultsProps = {
  banks: { id: string; name: string }[];
  results: Record<string, BankResult>;
  summary: SimulationOutcome["summary"] | null;
  loading: boolean;
  requestedAmount: number;
};

export function Results({ banks, results, summary, loading, requestedAmount }: ResultsProps) {
  const answered = Object.keys(results).length;

  return (
    <section className="results" aria-live="polite">
      <h2>Resultado da simulação</h2>
      <p className="summary">
        {summary
          ? `Aprovadas: ${summary.approved} · Reprovadas: ${summary.rejected} · Indisponíveis: ${summary.unavailable}`
          : `${answered} de ${banks.length} bancos responderam…`}
      </p>
      <div className="cards">
        {banks.map((bank) => {
          const result = results[bank.id];
          if (result) {
            return (
              <BankCard
                key={bank.id}
                result={result}
                isBest={summary?.bestOfferBankId === bank.id}
                requestedAmount={requestedAmount}
              />
            );
          }
          return loading ? <PendingCard key={bank.id} name={bank.name} /> : null;
        })}
      </div>
      {summary && summary.unavailable > 0 && (
        <p className="note">
          Algum banco não respondeu. Você pode simular novamente para tentar consultá-lo outra vez.
        </p>
      )}
    </section>
  );
}