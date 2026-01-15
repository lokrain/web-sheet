import assert from "node:assert/strict";
import {
  createAttr,
  createCloseToken,
  createCommentToken,
  createOpenToken,
  createProcessingInstructionToken,
  createSpan,
  createTextToken,
  createNamePool,
} from "@/xml";

test("interning the same name yields the same id", () => {
  const pool = createNamePool();
  const a1 = pool.intern("a");
  const a2 = pool.intern("a");
  const b = pool.intern("b");

  assert.equal(a1, a2);
  assert.notEqual(a1, b);
  assert.equal(pool.toString(a1), "a");
  assert.equal(pool.toString(b), "b");
});

test("unknown ids are rejected", () => {
  const pool = createNamePool();
  assert.throws(() => pool.toString(9999 as never));
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
  assert.equal(open.kind, "open");
  if (open.kind === "open") {
    assert.equal(open.name, name);
    assert.equal(open.attrs.length, 1);
  }

  const text = createTextToken("hi", 3, 5);
  assert.equal(text.kind, "text");

  const close = createCloseToken(name, 5, 9);
  assert.equal(close.kind, "close");

  const comment = createCommentToken(10, 14);
  assert.equal(comment.kind, "comment");

  const pi = createProcessingInstructionToken(15, 20);
  assert.equal(pi.kind, "pi");
});
