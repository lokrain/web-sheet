import assert from "node:assert/strict";

import { createNamePool, parseEvents, XmlError } from "@/xml";

test("parseEvents returns events with a reusable name pool", () => {
  const { events, pool } = parseEvents("<root><a>hi</a></root>");
  assert.equal(events.length > 0, true);
  assert.equal(typeof pool.intern, "function");
  assert.equal(typeof pool.toString, "function");
});

test("parseEvents respects tokenizer and parser options", () => {
  const { events } = parseEvents("<!--x--><root/>", {
    tokenizer: { emitNonContentEvents: true },
    parser: { emitNonContentEvents: true },
  });
  assert.equal(events[0].kind, "Comment");
});

test("parseEvents errors include line/column", () => {
  assert.throws(
    () => parseEvents("<a>\n</b>"),
    (e: unknown) =>
      e instanceof XmlError &&
      e.position.line === 2 &&
      e.position.column === 1,
  );
});
