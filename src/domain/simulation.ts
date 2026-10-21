import { z } from "zod";
import {
  isValidCpf,
  isValidCnpj,
  onlyDigits,
  normalizeCnpj,
} from "@/lib/document";

const MIN_AGE = 18;

function isRealDate(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

function ageInYears(iso: string, today = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  let age = today.getFullYear() - y;
  const hadBirthday =
    today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export const simulationRequestSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido")),
  cpf: z.string().refine(isValidCpf, "CPF inválido").transform(onlyDigits),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD")
    .refine(isRealDate, "Data inválida")
    .refine((v) => ageInYears(v) >= MIN_AGE, "É necessário ser maior de 18 anos"),
  salary: z.number().positive("Salário deve ser maior que zero").max(1_000_000),
  employerCnpj: z
    .string()
    .refine(isValidCnpj, "CNPJ do empregador inválido")
    .transform(normalizeCnpj),
  requestedAmount: z.number().positive("Informe o valor desejado").max(5_000_000),
  termMonths: z.number().int().min(6, "Mínimo de 6 meses").max(96, "Máximo de 96 meses"),
  registration: z.string().trim().max(30).optional(),
});

export type SimulationRequest = z.infer<typeof simulationRequestSchema>;