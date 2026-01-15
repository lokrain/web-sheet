import fs from "node:fs";
import path from "node:path";
import {
  createMusicXmlPathTracker,
  musicXmlPathToString,
} from "@/musicxml/xml/path";
import { parseEventsCollect } from "@/xml";

test("path tracker assigns sibling indices", () => {
  const fixturePath = path.join(
    process.cwd(),
    "src",
    "musicxml",
    "fixtures",
    "score-partwise.single-part.single-voice.xml",
  );
  const xml = fs.readFileSync(fixturePath, "utf8");
  const { pool, events } = parseEventsCollect(xml);

  const tracker = createMusicXmlPathTracker();
  const seen: string[] = [];

  for (const evt of events) {
    if (evt.kind === "StartElement") {
      tracker.write(evt);
      const current = tracker.path().at(-1);
      if (current && pool.toString(current.name) === "note") {
        seen.push(musicXmlPathToString(pool, tracker.path()));
      }
      continue;
    }
    if (evt.kind === "EndElement") tracker.write(evt);
  }

  expect(seen.length).toBeGreaterThanOrEqual(2);
  expect(seen[0]).toContain("note[0]");
  expect(seen[1]).toContain("note[1]");
});
