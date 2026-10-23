import { NextResponse } from "next/server";
import { z } from "zod";
import { simulationRequestSchema, type SimulationRequest } from "@/domain/simulation";

type ParseResult = { data: SimulationRequest } | { response: NextResponse };

export async function parseSimulationRequest(req: Request): Promise<ParseResult> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      response: NextResponse.json(
        { error: "invalid_json", message: "O corpo da requisição não é um JSON válido." },
        { status: 400 },
      ),
    };
  }

  const parsed = simulationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: "validation_error", fields: z.flattenError(parsed.error).fieldErrors },
        { status: 422 },
      ),
    };
  }
  return { data: parsed.data };
}