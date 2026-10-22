import { NextResponse } from "next/server";
import { z } from "zod";
import { simulationRequestSchema } from "@/domain/simulation";
import { runSimulation } from "@/services/simulation";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "O corpo da requisição não é um JSON válido." },
      { status: 400 },
    );
  }

  const parsed = simulationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 422 },
    );
  }

  const outcome = await runSimulation(parsed.data);
  return NextResponse.json(outcome);
}