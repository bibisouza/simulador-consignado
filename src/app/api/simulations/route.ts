import { NextResponse } from "next/server";
import { runSimulation } from "@/services/simulation";
import { parseSimulationRequest } from "./parse-request";

export async function POST(req: Request) {
  const parsed = await parseSimulationRequest(req);
  if ("response" in parsed) return parsed.response;

  const outcome = await runSimulation(parsed.data);
  return NextResponse.json(outcome);
}