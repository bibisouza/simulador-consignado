import type { StreamEvent } from "@/domain/stream-events";
import { runSimulation } from "@/services/simulation";
import { parseSimulationRequest } from "../parse-request";

export async function POST(req: Request) {
  const parsed = await parseSimulationRequest(req);
  if ("response" in parsed) return parsed.response;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true; // o cliente foi embora
        }
      };

      try {
        const outcome = await runSimulation(parsed.data, {
          onStart: (info) => send({ type: "started", ...info }),
          onBankResult: (result) => send({ type: "bank", result }),
        });
        send({ type: "done", outcome });
      } finally {
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}