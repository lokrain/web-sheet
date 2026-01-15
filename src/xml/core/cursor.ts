import type { XmlPosition } from "@/xml/core/error";
import { XmlParseError } from "@/xml/core/error";

export type Cursor = {
  input: string;
  len: number;
  i: number;
  baseOffset: number;
  line: number;
  column: number;
};

export function makeCursor(
  input: string,
  baseOffset = 0,
  line = 1,
  column = 1,
): Cursor {
  return { input, len: input.length, i: 0, baseOffset, line, column };
}

export function position(c: Cursor): XmlPosition {
  return { offset: c.baseOffset + c.i, line: c.line, column: c.column };
}

export function eof(c: Cursor): boolean {
  return c.i >= c.len;
}

export function peekCharCode(c: Cursor): number {
  return c.i < c.len ? c.input.charCodeAt(c.i) : -1;
}

export function nextCharCode(c: Cursor): number {
  if (c.i >= c.len) return -1;
  const cc = c.input.charCodeAt(c.i);
  if (cc === 13 && c.i + 1 < c.len && c.input.charCodeAt(c.i + 1) === 10) {
    advanceTo(c, c.i + 2);
    return cc;
  }
  advanceTo(c, c.i + 1);
  return cc;
}

export function expectCharCode(
  c: Cursor,
  code: number,
  errCode: string,
  msg: string,
): void {
  const got = nextCharCode(c);
  if (got !== code) throw new XmlParseError(errCode, position(c), msg);
}

export function indexOfFrom(c: Cursor, needle: string, from: number): number {
  return c.input.indexOf(needle, from);
}

export function slice(c: Cursor, start: number, end: number): string {
  return c.input.slice(start, end);
}

export function advanceBy(c: Cursor, count: number): XmlPosition {
  return advanceTo(c, c.i + count);
}

export function advanceTo(c: Cursor, nextIndex: number): XmlPosition {
  let i = c.i;
  const end = Math.min(nextIndex, c.len);
  while (i < end) {
    const cc = c.input.charCodeAt(i);
    if (cc === 13) {
      if (i + 1 < end && c.input.charCodeAt(i + 1) === 10) {
        i++;
      }
      c.line++;
      c.column = 1;
      i++;
      continue;
    }
    if (cc === 10) {
      c.line++;
      c.column = 1;
      i++;
      continue;
    }
    c.column++;
    i++;
  }
  c.i = end;
  return position(c);
}
