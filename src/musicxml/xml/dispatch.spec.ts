import fs from "node:fs";
import path from "node:path";
import { dispatchXmlEvents } from "@/musicxml/xml/dispatch";

import { musicXmlPathToString } from "@/musicxml/xml/path";
import type { MusicXmlReducer } from "@/musicxml/xml/reducer";
import { parseEventsCollect } from "@/xml";

type DebugOut = {
  kind: string;
  path: string;
  offset: number;
};

const debugReducer: MusicXmlReducer<null, DebugOut> = {
  init: () => null,
  consume: (_state, evt, ctx, emit) => {
    emit({
      kind: evt.kind,
      path: musicXmlPathToString(pool, ctx.path),
      offset: ctx.pos.offset,
    });
  },
};

let pool: ReturnType<typeof parseEventsCollect>["pool"];

function loadFixture(name: string): string {
  const p = path.join(process.cwd(), "src", "musicxml", "fixtures", name);
  return fs.readFileSync(p, "utf8");
}

test("dispatch attaches path + offset metadata", () => {
  const xml = loadFixture("score-partwise.single-part.single-voice.xml");
  const parsed = parseEventsCollect(xml);
  pool = parsed.pool;

  const out = dispatchXmlEvents(parsed.events, [debugReducer]);

  const startRoot = out.find(
    (e) => e.kind === "StartElement" && e.path.startsWith("score-partwise[0]"),
  );
  expect(startRoot).toBeTruthy();

  const someNoteStart = out.find(
    (e) => e.kind === "StartElement" && e.path.includes("note["),
  );
  expect(someNoteStart?.path).toContain("score-partwise[0]");
  expect(typeof someNoteStart?.offset).toBe("number");
});
