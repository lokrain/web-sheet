import assert from "node:assert/strict";
import { createNamePool } from "@/xml/public/name-pool";
import {
  createAttr,
  createCloseToken,
  createCommentToken,
  createOpenToken,
  createProcessingInstructionToken,
  createSpan,
  createTextToken,
} from "@/xml/public/types";

test("interning the same name yields the same id", () => {
  const pool = createNamePool();
  const a1 = pool.intern("a");
  const a2 = pool.intern("a");
  const b = pool.intern("b");

  assert.strictEqual(a1, a2);
  assert.notStrictEqual(a1, b);
  assert.strictEqual(pool.toString(a1), "a");
  assert.strictEqual(pool.toString(b), "b");
});

test("unknown ids are rejected", () => {
  const pool = createNamePool();
  const unknownId = 9999 as unknown as ReturnType<typeof pool.intern>;
  assert.throws(() => pool.toString(unknownId));
});

test("spans reject negative or inverted offsets", () => {
  assert.deepEqual(createSpan(1, 3), { start: 1, end: 3 });
  assert.throws(() => createSpan(-1, 1));
  assert.throws(() => createSpan(3, 2));
  assert.throws(() => createSpan(1.5, 2));
});

test("token factories produce well-formed tokens", () => {
  const pool = createNamePool();
  const name = pool.intern("a");
  const attr = createAttr(pool.intern("x"), "1");

  const open = createOpenToken(name, [attr], false, 0, 3);
  assert.strictEqual(open.kind, "open");
  if (open.kind === "open") {
    assert.strictEqual(open.name, name);
    assert.strictEqual(open.attrs.length, 1);
  }

  const text = createTextToken("hi", 3, 5);
  assert.strictEqual(text.kind, "text");

  const close = createCloseToken(name, 5, 9);
  assert.strictEqual(close.kind, "close");

  const comment = createCommentToken(10, 14);
  assert.strictEqual(comment.kind, "comment");

  const pi = createProcessingInstructionToken(15, 20);
  assert.strictEqual(pi.kind, "pi");
});
