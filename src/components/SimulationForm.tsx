"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { z } from "zod";
import { simulationRequestSchema } from "@/domain/simulation";
import type { BankResult } from "@/domain/bank-result";
import type { SimulationOutcome } from "@/domain/simulation-outcome";
import type { StreamEvent } from "@/domain/stream-events";
import { readNdjson } from "@/lib/ndjson";
import { formatCnpjInput, formatCpfInput } from "@/lib/format";
import { Field } from "./Field";
import { Results } from "./Results";

type FormValues = {
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  salary: string;
  employerCnpj: string;
  requestedAmount: string;
  termMonths: string;
  registration: string;
};

type FieldErrors = Partial<Record<string, string>>;
type Status = "idle" | "loading" | "done";

type Live = {
  requestedAmount: number;
  banks: { id: string; name: string }[];
  results: Record<string, BankResult>;
  summary: SimulationOutcome["summary"] | null;
};

const INITIAL: FormValues = {
  name: "",
  email: "",
  cpf: "",
  birthDate: "",
  salary: "",
  employerCnpj: "",
  requestedAmount: "",
  termMonths: "24",
  registration: "",
};

const TERM_OPTIONS = [12, 24, 36, 48, 60, 72, 84, 96];

function toPayload(v: FormValues) {
  return {
    name: v.name,
    email: v.email,
    cpf: v.cpf,
    birthDate: v.birthDate,
    salary: Number(v.salary),
    employerCnpj: v.employerCnpj,
    requestedAmount: Number(v.requestedAmount),
    termMonths: Number(v.termMonths),
    registration: v.registration.trim() || undefined,
  };
}

/** Pega a primeira mensagem de cada campo. */
function firstMessages(fieldErrors: Record<string, string[] | undefined>): FieldErrors {
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([field, messages]) =>
      messages?.[0] ? [[field, messages[0]]] : [],
    ),
  );
}

export function SimulationForm() {
  const [values, setValues] = useState<FormValues>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [live, setLive] = useState<Live | null>(null);

  /** Props comuns de cada campo: valor, onChange (com máscara opcional) e acessibilidade. */
  const bind = (name: keyof FormValues, mask?: (value: string) => string) => ({
    id: name,
    name,
    value: values[name],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = mask ? mask(e.target.value) : e.target.value;
      setValues((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return; // evita envio duplicado

    const payload = toPayload(values);

    // 1) Validação local: mesma regra do servidor, resposta imediata.
    const check = simulationRequestSchema.safeParse(payload);
    if (!check.success) {
      setErrors(firstMessages(z.flattenError(check.error).fieldErrors));
      return;
    }

    setErrors({});
    setFormError(null);
    setLive(null);
    setStatus("loading");

    try {
      const res = await fetch("/api/simulations/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 2) O servidor revalida: se discordar, mostramos os erros nos campos.
      if (res.status === 422) {
        const data = (await res.json()) as { fields?: Record<string, string[] | undefined> };
        setErrors(firstMessages(data.fields ?? {}));
        setStatus("idle");
        return;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      // 3) Cada evento atualiza a tela na hora.
      let finished = false;
      for await (const raw of readNdjson(res.body)) {
        const streamEvent = raw as StreamEvent;
        switch (streamEvent.type) {
          case "started":
            setLive({
              requestedAmount: payload.requestedAmount,
              banks: streamEvent.banks,
              results: {},
              summary: null,
            });
            break;
          case "bank":
            setLive((prev) =>
              prev
                ? {
                    ...prev,
                    results: { ...prev.results, [streamEvent.result.bankId]: streamEvent.result },
                  }
                : prev,
            );
            break;
          case "done":
            finished = true;
            setLive((prev) =>
              prev
                ? {
                    ...prev,
                    results: Object.fromEntries(streamEvent.outcome.results.map((r) => [r.bankId, r])),
                    summary: streamEvent.outcome.summary,
                  }
                : prev,
            );
            break;
        }
      }

      // Se a resposta acabou sem o "done", algo falhou no meio do caminho.
      if (!finished) throw new Error("stream encerrado antes do fim");
      setStatus("done");
    } catch {
      setFormError("Não foi possível concluir a simulação agora. Tente novamente em instantes.");
      setStatus("idle");
    }
  }

  const loading = status === "loading";

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="form">
        <div className="grid">
          <Field label="Nome completo" htmlFor="name" error={errors.name}>
            <input {...bind("name")} type="text" autoComplete="name" />
          </Field>

          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <input {...bind("email")} type="email" autoComplete="email" />
          </Field>

          <Field label="CPF" htmlFor="cpf" error={errors.cpf}>
            <input
              {...bind("cpf", formatCpfInput)}
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
            />
          </Field>

          <Field label="Data de nascimento" htmlFor="birthDate" error={errors.birthDate}>
            <input {...bind("birthDate")} type="date" autoComplete="bday" />
          </Field>

          <Field label="Salário mensal (R$)" htmlFor="salary" error={errors.salary}>
            <input {...bind("salary")} type="number" inputMode="decimal" min="0" step="0.01" />
          </Field>

          <Field label="CNPJ do empregador" htmlFor="employerCnpj" error={errors.employerCnpj}>
            <input
              {...bind("employerCnpj", formatCnpjInput)}
              type="text"
              placeholder="00.000.000/0000-00"
            />
          </Field>

          <Field label="Valor desejado (R$)" htmlFor="requestedAmount" error={errors.requestedAmount}>
            <input
              {...bind("requestedAmount")}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
            />
          </Field>

          <Field label="Prazo" htmlFor="termMonths" error={errors.termMonths}>
            <select {...bind("termMonths")}>
              {TERM_OPTIONS.map((months) => (
                <option key={months} value={months}>
                  {months} meses
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Matrícula (opcional)"
            htmlFor="registration"
            error={errors.registration}
            hint="Se souber, ajuda o banco a localizar seu vínculo."
          >
            <input {...bind("registration")} type="text" />
          </Field>
        </div>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Consultando bancos…" : "Simular empréstimo"}
        </button>
        {loading && (
          <p className="note" aria-live="polite">
            Os bancos aparecem abaixo assim que responderem.
          </p>
        )}
      </form>

      {live && (
        <Results
          banks={live.banks}
          results={live.results}
          summary={live.summary}
          loading={loading}
          requestedAmount={live.requestedAmount}
        />
      )}
    </>
  );
}