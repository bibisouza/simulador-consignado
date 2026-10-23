import { describe, it, expect } from "vitest";
import { readNdjson } from "./ndjson";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function collect(chunks: string[]): Promise<unknown[]> {
  const out: unknown[] = [];
  for await (const item of readNdjson(streamOf(chunks))) out.push(item);
  return out;
}

describe("readNdjson", () => {
  it("lê uma linha por evento", async () => {
    expect(await collect(['{"a":1}\n{"b":2}\n'])).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("junta linhas partidas entre pedaços", async () => {
    expect(await collect(['{"a":1}\n{"b"', ":2}\n"])).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("aceita a última linha sem quebra e ignora linhas vazias", async () => {
    expect(await collect(['{"a":1}\n\n', '{"b":2}'])).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("lança erro se uma linha não for JSON", async () => {
    await expect(collect(["isso não é json\n"])).rejects.toThrow();
  });
});