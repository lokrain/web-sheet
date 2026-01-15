/** @jest-environment node */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  createNamePool,
  parseEventsFromAsyncIterable,
  parseEventsIterable,
  parseEventsToSink,
} from "../src/xml";
import type { XmlNamePool } from "../src/xml/public/name-pool";
import type { XmlEvent } from "../src/xml/public/types";

type PoolNameRef = Parameters<XmlNamePool["toString"]>[0];
type StartElementAttr = { name: PoolNameRef; value: unknown };

const FIXTURES_DIR = path.join(process.cwd(), "bench", "fixtures");
const BASELINE_PATH = path.join(process.cwd(), "perf", "baseline.json");
const ITERATIONS = 3;
const REGRESSION_FACTOR = 20;
const P95_REGRESSION_FACTOR = 20;

function loadBaseline() {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
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
      const attrs = evt.attrs
        .map(
          (attr: StartElementAttr) =>
            `${pool.toString(attr.name)}=${String(attr.value)}`,
        )
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
      return String(evt);
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

test("XML perf stays within baseline", async () => {
  const baseline = loadBaseline();
  const fixtureFiles = Object.keys(baseline.fixtures);

  for (const name of fixtureFiles) {
    const fixturePath = path.join(FIXTURES_DIR, `${name}.xml`);
    const text = fs.readFileSync(fixturePath, "utf8");
    const fixtureBaseline = baseline.fixtures[name];

    const stringSink = await runTimed(ITERATIONS, async () => {
      let count = 0;
      await parseEventsToSink(text, () => {
        count++;
      });
      return { events: count };
    });

    const stringCollect = await runTimed(ITERATIONS, async () => {
      const pool = createNamePool();
      const events = Array.from(parseEventsIterable(text, { pool }));
      let hash = 0x811c9dc5;
      for (const evt of events) {
        const sig = signatureForEvent(evt, pool);
        hash = hashString(`${hash}:${sig}`);
      }
      return { events: events.length, hash };
    });

    const streamSink = await runTimed(ITERATIONS, async () => {
      let count = 0;
      await parseEventsToSink(chunkBytes(text), () => {
        count++;
      });
      return { events: count };
    });

    const streamCollect = await runTimed(ITERATIONS, async () => {
      const pool = createNamePool();
      const result = await collectHashAndCount(
        parseEventsFromAsyncIterable(chunkBytes(text), { pool }),
        pool,
      );
      return { events: result.events, hash: result.hash };
    });

    const current = {
      "string->sink": stringSink,
      "string->collect": stringCollect,
      "stream->sink": streamSink,
      "stream->collect": streamCollect,
    };

    for (const [mode, data] of Object.entries(current)) {
      const baselineMode = fixtureBaseline.modes[mode];
      assert.equal(
        data.events,
        baselineMode.events,
        `${name}:${mode} event count regression`,
      );
      if (baselineMode.hash !== undefined) {
        assert.equal(
          data.hash,
          baselineMode.hash,
          `${name}:${mode} hash regression`,
        );
      }

      const medianMs = median(data.times);
      const baselineMedian = baselineMode.medianMs;
      assert.ok(
        medianMs <= baselineMedian * REGRESSION_FACTOR,
        `${name}:${mode} median regression (${medianMs.toFixed(2)}ms > ${baselineMedian.toFixed(2)}ms)`,
      );

      const currentP95 = p95(data.times);
      const baselineP95 = baselineMode.p95Ms;
      assert.ok(
        currentP95 <= baselineP95 * P95_REGRESSION_FACTOR,
        `${name}:${mode} p95 regression (${currentP95.toFixed(2)}ms > ${baselineP95.toFixed(2)}ms)`,
      );
    }
  }
});
