import fs from "node:fs";
import path from "node:path";

import { mapMusicXmlScorePartwise } from "@/musicxml/xml/stream-mapper";
import { mapMusicXmlScorePartwiseEventStream } from "@/musicxml/xml/streaming";

function loadFixture(name: string): string {
  const fixturesDir = path.join(process.cwd(), "src", "musicxml", "fixtures");
  return fs.readFileSync(path.join(fixturesDir, name), "utf8");
}

async function* chunkString(
  input: string,
  size: number,
): AsyncIterable<string> {
  for (let i = 0; i < input.length; i += size) {
    yield input.slice(i, i + size);
  }
}

test("mapMusicXmlScorePartwiseEventStream matches sync mapping", async () => {
  const xml = loadFixture("score-partwise.single-part.single-voice.xml");
  const sync = mapMusicXmlScorePartwise(xml, { strict: true });

  const stream = await mapMusicXmlScorePartwiseEventStream(
    chunkString(xml, 7),
    {
      strict: true,
    },
  );
  const streamedEvents = [];
  for await (const e of stream.events) streamedEvents.push(e);
  await stream.diagnostics;

  expect(streamedEvents).toEqual(sync.events);
});
