import fs from "node:fs";
import path from "node:path";

import { mapMusicXmlScorePartwise } from "../src/musicxml/xml";

type BenchResult = {
  name: string;
  iterations: number;
  msTotal: number;
  msPerIter: number;
  eventsPerIter: number;
};

function nowMs(): number {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

function loadFixture(name: string): string {
  const fixturesDir = path.join(process.cwd(), "src", "musicxml", "fixtures");
  return fs.readFileSync(path.join(fixturesDir, name), "utf8");
}

function runCase(name: string, xml: string, iterations: number): BenchResult {
  // Warmup
  mapMusicXmlScorePartwise(xml, { strict: true });

  if (global.gc) global.gc();
  const t0 = nowMs();
  let lastEvents = 0;
  for (let i = 0; i < iterations; i++) {
    const res = mapMusicXmlScorePartwise(xml, { strict: true });
    lastEvents = res.events.length;
  }
  const t1 = nowMs();

  const msTotal = t1 - t0;
  return {
    name,
    iterations,
    msTotal,
    msPerIter: msTotal / iterations,
    eventsPerIter: lastEvents,
  };
}

const small = loadFixture("score-partwise.single-part.single-voice.xml");
const large = loadFixture("score-partwise.multi-voice.backup-forward.xml");

const results: BenchResult[] = [
  runCase("musicxml-small", small, 200),
  runCase("musicxml-large", large, 50),
];

process.stdout.write(JSON.stringify({ results }, null, 2));
