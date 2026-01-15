import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { Readable } from "node:stream";

import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });

import {
  parseEventsFromNodeReadable,
  parseEventsIterable,
  parseEventsToSink,
} from "../src/xml";

type Fixture = {
  name: string;
  filePath: string;
  text: string;
  bytes: number;
};

type RunMetrics = {
  elapsedMs: number;
  bytes: number;
  events: number;
  throughputMBps: number;
  heapUsedBefore: number;
  heapUsedAfter: number;
  rssBefore: number;
  rssAfter: number;
};

type ModeName =
  | "string->sink"
  | "string->collect"
  | "stream->sink"
  | "stream->collect";

type ModeResult = {
  runs: RunMetrics[];
  medianMs: number;
  p95Ms: number;
};

type BenchResult = {
  fixture: string;
  mode: ModeName;
  bytes: number;
  events: number;
  medianMs: number;
  p95Ms: number;
  throughputMBps: number;
  heapUsedBefore: number;
  heapUsedAfter: number;
  rssBefore: number;
  rssAfter: number;
  runs: RunMetrics[];
};

const FIXTURES_DIR = path.join(process.cwd(), "bench", "fixtures");
const RESULTS_PATH = path.join(process.cwd(), "bench", "results.json");

function loadFixtures(): Fixture[] {
  const entries = [
    { name: "medium", filePath: path.join(FIXTURES_DIR, "medium.xml") },
    {
      name: "pathological",
      filePath: path.join(FIXTURES_DIR, "pathological.xml"),
    },
    { name: "deep", filePath: path.join(FIXTURES_DIR, "deep.xml") },
    { name: "entities", filePath: path.join(FIXTURES_DIR, "entities.xml") },
  ];

  const fixtures: Fixture[] = entries.map((entry) => {
    const text = fs.readFileSync(entry.filePath, "utf8");
    return {
      name: entry.name,
      filePath: entry.filePath,
      text,
      bytes: Buffer.byteLength(text),
    };
  });

  const external = process.env.XML_BENCH_FILE;
  if (external && fs.existsSync(external)) {
    const text = fs.readFileSync(external, "utf8");
    fixtures.push({
      name: path.basename(external),
      filePath: external,
      text,
      bytes: Buffer.byteLength(text),
    });
  }

  return fixtures;
}

function ensureGc(): void {
  if (typeof global.gc === "function") {
    global.gc();
  }
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

function toReadable(pathOrText: { filePath: string }): Readable {
  return fs.createReadStream(pathOrText.filePath);
}

async function runStringSink(
  fixture: Fixture,
): Promise<{ events: number; elapsedMs: number }> {
  let count = 0;
  const start = performance.now();
  await parseEventsToSink(fixture.text, () => {
    count++;
  });
  const elapsedMs = performance.now() - start;
  return { events: count, elapsedMs };
}

async function runStringCollect(
  fixture: Fixture,
): Promise<{ events: number; elapsedMs: number }> {
  const start = performance.now();
  const events = Array.from(parseEventsIterable(fixture.text));
  const elapsedMs = performance.now() - start;
  return { events: events.length, elapsedMs };
}

async function runStreamSink(
  fixture: Fixture,
): Promise<{ events: number; elapsedMs: number }> {
  let count = 0;
  const stream = toReadable(fixture);
  const start = performance.now();
  await parseEventsToSink(stream, () => {
    count++;
  });
  const elapsedMs = performance.now() - start;
  return { events: count, elapsedMs };
}

async function runStreamCollect(
  fixture: Fixture,
): Promise<{ events: number; elapsedMs: number }> {
  const stream = toReadable(fixture);
  const start = performance.now();
  const events: unknown[] = [];
  for await (const evt of parseEventsFromNodeReadable(stream)) events.push(evt);
  const elapsedMs = performance.now() - start;
  return { events: events.length, elapsedMs };
}

async function runMode(
  fixture: Fixture,
  mode: ModeName,
  iterations: number,
): Promise<ModeResult> {
  const runs: RunMetrics[] = [];
  for (let i = 0; i < iterations; i++) {
    ensureGc();
    const memBefore = process.memoryUsage();
    const start = performance.now();

    let result: { events: number; elapsedMs: number };
    switch (mode) {
      case "string->sink":
        result = await runStringSink(fixture);
        break;
      case "string->collect":
        result = await runStringCollect(fixture);
        break;
      case "stream->sink":
        result = await runStreamSink(fixture);
        break;
      case "stream->collect":
        result = await runStreamCollect(fixture);
        break;
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    const elapsedMs = performance.now() - start;
    const memAfter = process.memoryUsage();
    runs.push({
      elapsedMs: result.elapsedMs || elapsedMs,
      bytes: fixture.bytes,
      events: result.events,
      throughputMBps: fixture.bytes / 1_000_000 / (result.elapsedMs / 1000),
      heapUsedBefore: memBefore.heapUsed,
      heapUsedAfter: memAfter.heapUsed,
      rssBefore: memBefore.rss,
      rssAfter: memAfter.rss,
    });
  }

  const times = runs.map((r) => r.elapsedMs);
  return {
    runs,
    medianMs: median(times),
    p95Ms: p95(times),
  };
}

async function main(): Promise<void> {
  const fixtures = loadFixtures();
  const modes: ModeName[] = [
    "string->sink",
    "string->collect",
    "stream->sink",
    "stream->collect",
  ];
  const iterations = 7;

  const results: BenchResult[] = [];

  for (const fixture of fixtures) {
    for (const mode of modes) {
      const result = await runMode(fixture, mode, iterations);
      const last = result.runs[result.runs.length - 1];
      results.push({
        fixture: fixture.name,
        mode,
        bytes: fixture.bytes,
        events: last.events,
        medianMs: result.medianMs,
        p95Ms: result.p95Ms,
        throughputMBps: fixture.bytes / 1_000_000 / (result.medianMs / 1000),
        heapUsedBefore: last.heapUsedBefore,
        heapUsedAfter: last.heapUsedAfter,
        rssBefore: last.rssBefore,
        rssAfter: last.rssAfter,
        runs: result.runs,
      });

      console.log(
        `${fixture.name} [${mode}] :: median ${result.medianMs.toFixed(2)} ms, p95 ${result.p95Ms.toFixed(2)} ms, events ${last.events}`,
      );
    }
  }

  fs.writeFileSync(
    RESULTS_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
