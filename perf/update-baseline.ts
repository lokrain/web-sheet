import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  createNamePool,
  parseEventsFromAsyncIterable,
  parseEventsIterable,
  parseEventsToSink,
  type XmlEvent,
  type XmlNamePool,
} from "../src/xml";

type Fixture = {
  name: string;
  text: string;
  bytes: number;
};

type ModeMetrics = {
  medianMs: number;
  p95Ms: number;
  events: number;
  hash?: number;
};

type Baseline = {
  generatedAt: string;
  fixtures: Record<
    string,
    {
      bytes: number;
      modes: Record<string, ModeMetrics>;
    }
  >;
};

const FIXTURES_DIR = path.join(process.cwd(), "bench", "fixtures");
const BASELINE_PATH = path.join(process.cwd(), "perf", "baseline.json");

const FIXTURE_FILES = [
  { name: "medium", file: "medium.xml" },
  { name: "pathological", file: "pathological.xml" },
  { name: "deep", file: "deep.xml" },
  { name: "entities", file: "entities.xml" },
];

function loadFixtures(): Fixture[] {
  return FIXTURE_FILES.map((f) => {
    const text = fs.readFileSync(path.join(FIXTURES_DIR, f.file), "utf8");
    return { name: f.name, text, bytes: Buffer.byteLength(text) };
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx];
}

function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function signatureForEvent(evt: XmlEvent, pool: XmlNamePool): string {
  switch (evt.kind) {
    case "StartElement": {
      const name = pool.toString(evt.name);
      type NameId = Parameters<XmlNamePool["toString"]>[0];
      type StartAttr = { name: NameId; value: unknown };
      const attrs = (evt.attrs as StartAttr[])
        .map((attr) => `${pool.toString(attr.name)}=${String(attr.value)}`)
        .join(",");
      return `Start:${name}:${attrs}:${evt.selfClosing}`;
    }
    case "EndElement":
      return `End:${pool.toString(evt.name)}`;
    case "Text":
      return `Text:${evt.value}`;
    case "Comment":
      return "Comment";
    case "ProcessingInstruction":
      return "ProcessingInstruction";
    default: {
      // XmlEvent may grow over time; keep baseline generation resilient.
      // Prefer a stable signature over a compile-time exhaustiveness check here.
      return `Unknown:${String((evt as { kind?: unknown }).kind ?? "(missing kind)")}`;
    }
  }
}

async function collectHashAndCount(
  source: AsyncIterable<XmlEvent>,
  pool: XmlNamePool,
): Promise<{ events: number; hash: number }> {
  let count = 0;
  let hash = 0x811c9dc5;
  for await (const evt of source) {
    const sig = signatureForEvent(evt, pool);
    hash = hashString(`${hash}:${sig}`);
    count++;
  }
  return { events: count, hash };
}

async function* chunkBytes(
  text: string,
  size = 64 * 1024,
): AsyncIterable<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  for (let i = 0; i < bytes.length; i += size) {
    yield bytes.slice(i, i + size);
  }
}

async function runTimed(
  iterations: number,
  fn: () => Promise<{ events: number; hash?: number }>,
): Promise<{ times: number[]; events: number; hash?: number }> {
  const times: number[] = [];
  let events = 0;
  let hash: number | undefined;
  for (let i = 0; i < iterations; i++) {
    if (typeof global.gc === "function") global.gc();
    const start = performance.now();
    const result = await fn();
    times.push(performance.now() - start);
    events = result.events;
    if (result.hash !== undefined) hash = result.hash;
  }
  return { times, events, hash };
}

async function main(): Promise<void> {
  const fixtures = loadFixtures();
  const iterations = 5;
  const baseline: Baseline = {
    generatedAt: new Date().toISOString(),
    fixtures: {},
  };

  for (const fixture of fixtures) {
    const modes: Record<string, ModeMetrics> = {};

    const stringSink = await runTimed(iterations, async () => {
      let count = 0;
      await parseEventsToSink(fixture.text, () => {
        count++;
      });
      return { events: count };
    });
    modes["string->sink"] = {
      medianMs: median(stringSink.times),
      p95Ms: p95(stringSink.times),
      events: stringSink.events,
    };

    const stringCollect = await runTimed(iterations, async () => {
      const pool = createNamePool();
      const events = Array.from(parseEventsIterable(fixture.text, { pool }));
      let hash = 0x811c9dc5;
      for (const evt of events) {
        const sig = signatureForEvent(evt, pool);
        hash = hashString(`${hash}:${sig}`);
      }
      return { events: events.length, hash };
    });
    modes["string->collect"] = {
      medianMs: median(stringCollect.times),
      p95Ms: p95(stringCollect.times),
      events: stringCollect.events,
      hash: stringCollect.hash,
    };

    const streamSink = await runTimed(iterations, async () => {
      let count = 0;
      await parseEventsToSink(chunkBytes(fixture.text), () => {
        count++;
      });
      return { events: count };
    });
    modes["stream->sink"] = {
      medianMs: median(streamSink.times),
      p95Ms: p95(streamSink.times),
      events: streamSink.events,
    };

    const streamCollect = await runTimed(iterations, async () => {
      const pool = createNamePool();
      const result = await collectHashAndCount(
        parseEventsFromAsyncIterable(chunkBytes(fixture.text), { pool }),
        pool,
      );
      return { events: result.events, hash: result.hash };
    });
    modes["stream->collect"] = {
      medianMs: median(streamCollect.times),
      p95Ms: p95(streamCollect.times),
      events: streamCollect.events,
      hash: streamCollect.hash,
    };

    baseline.fixtures[fixture.name] = { bytes: fixture.bytes, modes };
  }

  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
  console.log(`Baseline updated: ${BASELINE_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
