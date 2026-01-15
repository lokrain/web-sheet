import assert from "node:assert/strict";

import { createNamePool, parseEvents } from "@/xml";

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
