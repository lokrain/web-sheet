import assert from "node:assert/strict";

import { offsetToLineColumn, spanToLineColumn } from "@/xml/public/position";

test("line/column mapping handles LF newlines", () => {
  const input = "a\nb";
  assert.deepEqual(offsetToLineColumn(input, 0), { line: 1, column: 1 });
  assert.deepEqual(offsetToLineColumn(input, 1), { line: 1, column: 2 });
  assert.deepEqual(offsetToLineColumn(input, 2), { line: 2, column: 1 });
});

test("line/column mapping handles CRLF newlines", () => {
  const input = "a\r\nb";
  assert.deepEqual(offsetToLineColumn(input, 0), { line: 1, column: 1 });
  assert.deepEqual(offsetToLineColumn(input, 1), { line: 1, column: 2 });
  assert.deepEqual(offsetToLineColumn(input, 2), { line: 2, column: 1 });
});

test("span mapping reports start and end positions", () => {
  const input = "a\nb";
  const span = { start: 0, end: 2 };
  assert.deepEqual(spanToLineColumn(input, span), {
    start: { line: 1, column: 1 },
    end: { line: 2, column: 1 },
  });
});

test("offsets beyond input length are clamped", () => {
  const input = "a\n";
  assert.deepEqual(offsetToLineColumn(input, 999), { line: 2, column: 1 });
});
