import fs from "node:fs";
import path from "node:path";

import {
  detectMusicXmlRoot,
  mapMusicXmlScorePartwise,
} from "@/musicxml/xml/stream-mapper";

function loadFixture(name: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), "src", "musicxml", "fixtures", name),
    "utf8",
  );
}

test("detectMusicXmlRoot detects score-partwise", () => {
  const xml = loadFixture("score-partwise.single-part.single-voice.xml");
  const { root, diagnostics } = detectMusicXmlRoot(xml);
  expect(diagnostics).toHaveLength(0);
  expect(root.kind).toBe("score-partwise");
});

test("detectMusicXmlRoot detects score-timewise", () => {
  const xml = loadFixture("score-timewise.min.xml");
  const { root, diagnostics } = detectMusicXmlRoot(xml);
  expect(diagnostics).toHaveLength(0);
  expect(root.kind).toBe("score-timewise");
});

test("mapMusicXmlScorePartwise permissive returns diagnostics for timewise", () => {
  const xml = loadFixture("score-timewise.min.xml");
  const res = mapMusicXmlScorePartwise(xml, { strict: false });
  expect(res.diagnostics.length).toBeGreaterThan(0);
  expect(res.events).toHaveLength(0);
});

test("mapMusicXmlScorePartwise strict throws for timewise", () => {
  const xml = loadFixture("score-timewise.min.xml");
  expect(() => mapMusicXmlScorePartwise(xml, { strict: true })).toThrow();
});

test("mapMusicXmlScorePartwise emits PartDef from part-list", () => {
  const xml = loadFixture("score-partwise.single-part.single-voice.xml");
  const res = mapMusicXmlScorePartwise(xml, { strict: true });

  expect(res.diagnostics).toHaveLength(0);
  expect(res.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "PartDef", partId: "P1", name: "Piano" }),
    ]),
  );

  expect(res.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "Divisions",
        partId: "P1",
        divisions: 4,
      }),
    ]),
  );

  expect(res.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "MeasureStart",
        partId: "P1",
        measureNo: "1",
      }),
      expect.objectContaining({
        kind: "MeasureEnd",
        partId: "P1",
        measureNo: "1",
      }),
    ]),
  );
});

test("mapMusicXmlScorePartwise marks implicit measures", () => {
  const xml = loadFixture("score-partwise.implicit-measure.xml");
  const res = mapMusicXmlScorePartwise(xml, { strict: true });

  const start = res.events.find((e) => e.kind === "MeasureStart");
  expect(start && "implicit" in start ? start.implicit : null).toBe(true);
});

test("mapMusicXmlScorePartwise emits divisions changes", () => {
  const xml = loadFixture("score-partwise.divisions-change.xml");
  const res = mapMusicXmlScorePartwise(xml, { strict: true });

  const divisions = res.events.filter((e) => e.kind === "Divisions");
  expect(divisions.map((d) => ("divisions" in d ? d.divisions : null))).toEqual(
    [4, 8],
  );
});
