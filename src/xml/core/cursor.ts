import { XmlParseError } from "@/xml/core/error";

export type Cursor = {
  input: string;
  len: number;
  i: number;
};

export function makeCursor(input: string): Cursor {
  return { input, len: input.length, i: 0 };
}

export function eof(c: Cursor): boolean {
  return c.i >= c.len;
}

export function peekCharCode(c: Cursor): number {
  return c.i < c.len ? c.input.charCodeAt(c.i) : -1;
}

export function nextCharCode(c: Cursor): number {
  return c.i < c.len ? c.input.charCodeAt(c.i++) : -1;
}

export function expectCharCode(
  c: Cursor,
  code: number,
  errCode: string,
  msg: string,
): void {
  const got = nextCharCode(c);
  if (got !== code) throw new XmlParseError(errCode, Math.max(0, c.i - 1), msg);
}

export function indexOfFrom(c: Cursor, needle: string, from: number): number {
  return c.input.indexOf(needle, from);
}

export function slice(c: Cursor, start: number, end: number): string {
  return c.input.slice(start, end);
}
