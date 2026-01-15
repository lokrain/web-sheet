import assert from "node:assert/strict";

import {
  compilePathString,
  compileSelector,
  createDomlessTreeBuilder,
  createNamePool,
  createPathSelector,
  parseEvents,
  type SelectorContext,
} from "@/xml";

test("builds a tree from element and text events", () => {
  const { pool, events } = parseEvents("<root><a>hi</a><b/></root>");

  const b = createDomlessTreeBuilder();
  for (const e of events) b.onEvent(e);

  const roots = b.getResult();
  assert.equal(roots.length, 1);

  const root = roots[0];
  assert.equal(root.kind, "Element");
  assert.equal(
    pool.toString(root.kind === "Element" ? root.name : (0 as never)),
    "root",
  );

  if (root.kind !== "Element") throw new Error("expected element");
  assert.equal(root.children.length, 2);
  assert.equal(root.children[0].kind, "Element");
  assert.equal(root.children[1].kind, "Element");
});

test("rejects reading result while elements are still open", () => {
  const pool = createNamePool();
  const root = pool.intern("root");

  const b = createDomlessTreeBuilder();
  b.onEvent({
    kind: "StartElement",
    name: root,
    attrs: [],
    selfClosing: false,
    span: { start: 0, end: 6 },
  });

  assert.throws(() => b.getResult(), /unfinished tree/);
});

test("dispatches handlers only for the exact absolute path", () => {
  const pool = createNamePool();

  const hit: string[] = [];
  const path = compilePathString("root/a", pool);

  const { onEvent } = createPathSelector(
    [
      {
        path,
        onEnter: (ctx: SelectorContext) =>
          hit.push(`enter:${ctx.nameToString(ctx.name)}:${ctx.depth}`),
        onExit: (ctx: SelectorContext) =>
          hit.push(`exit:${ctx.nameToString(ctx.name)}:${ctx.depth}`),
        onText: (_ctx: SelectorContext, t: string) => hit.push(`text:${t}`),
      },
    ],
    pool,
  );

  const { events } = parseEvents("<root><a>hi</a><b><a>no</a></b></root>");
  for (const e of events) onEvent(e);

  // Should match only root/a, not root/b/a
  assert.deepEqual(hit, ["enter:a:2", "text:hi", "exit:a:2"]);
});

test("delivers subtree text when capture is enabled", () => {
  const pool = createNamePool();
  const captured: string[] = [];

  const path = compilePathString("root/b", pool);
  const { onEvent } = createPathSelector(
    [
      {
        path,
        textCaptureSubtree: true,
        onText: (_ctx: SelectorContext, t: string) => captured.push(t),
      },
    ],
    pool,
  );

  const { events } = parseEvents("<root><b><a>one</a><c>two</c></b></root>");
  for (const e of events) onEvent(e);

  assert.deepEqual(captured, ["one", "two"]);
});

test("reset clears prior results before reuse", () => {
  const { events } = parseEvents("<root><a/></root>");
  const b = createDomlessTreeBuilder();
  for (const e of events) b.onEvent(e);
  assert.equal(b.getResult().length, 1);

  b.reset();

  const { events: events2 } = parseEvents("<root><b/></root>");
  for (const e of events2) b.onEvent(e);
  const roots = b.getResult();
  assert.equal(roots.length, 1);
});

test("rejects empty path specifications", () => {
  assert.throws(() => compileSelector([{ path: [] }]));
});

test("selector dispatches enter/text/exit events", () => {
  const pool = createNamePool();
  const path = compilePathString("root/a", pool);
  const hit: string[] = [];

  const { selector } = createPathSelector([
    {
      path,
      onEnter: (ctx: SelectorContext) => hit.push(`enter:${ctx.depth}`),
      onExit: (ctx: SelectorContext) => hit.push(`exit:${ctx.depth}`),
      onText: (_ctx: SelectorContext, t: string) => hit.push(`text:${t}`),
    },
  ], pool);
  const { events } = parseEvents("<root><a>hi</a></root>");
  for (const e of events) selector.onEvent(e);

  assert.deepEqual(hit, ["enter:2", "text:hi", "exit:2"]);
});
