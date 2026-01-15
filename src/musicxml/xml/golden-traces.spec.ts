import fs from "node:fs";
import path from "node:path";

import { mapMusicXmlScorePartwise } from "@/musicxml/xml/stream-mapper";

type AnyEvent = Record<string, unknown>;

function stripOffsetFromMeta(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripOffsetFromMeta);

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "offset") continue;
    out[k] = stripOffsetFromMeta(v);
  }
  return out;
}

function normalizeEvent(e: AnyEvent): AnyEvent {
  if ("meta" in e && e.meta && typeof e.meta === "object") {
    return {
      ...e,
      meta: stripOffsetFromMeta(e.meta),
    };
  }
  return e;
}

function normalizeTrace(res: ReturnType<typeof mapMusicXmlScorePartwise>) {
  return {
    events: res.events.map((e) => normalizeEvent(e as AnyEvent)),
    diagnostics: res.diagnostics.map((d) => stripOffsetFromMeta(d)),
  };
}

function listPartwiseFixtures(): string[] {
  const fixturesDir = path.join(process.cwd(), "src", "musicxml", "fixtures");
  const names = fs
    .readdirSync(fixturesDir)
    .filter((f) => f.startsWith("score-partwise.") && f.endsWith(".xml"))
    .filter((f) => !f.includes(".invalid-"));
  return names.sort();
}

describe("MusicXML golden traces", () => {
  test.each(listPartwiseFixtures())("fixture: %s", (fixtureName) => {
    const fixturesDir = path.join(process.cwd(), "src", "musicxml", "fixtures");
    const xml = fs.readFileSync(path.join(fixturesDir, fixtureName), "utf8");

    const res = mapMusicXmlScorePartwise(xml, { strict: true });
    expect(normalizeTrace(res)).toMatchSnapshot();
  });
});
