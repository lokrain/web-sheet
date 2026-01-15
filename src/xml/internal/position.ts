import type { XmlPosition } from "@/xml/core/error";

export function advancePosition(
  base: XmlPosition,
  text: string,
  count: number,
): XmlPosition {
  let line = base.line;
  let column = base.column;
  let i = 0;
  while (i < count && i < text.length) {
    const cc = text.charCodeAt(i);
    if (cc === 13) {
      if (i + 1 < count && text.charCodeAt(i + 1) === 10) {
        i++;
      }
      line++;
      column = 1;
      i++;
      continue;
    }
    if (cc === 10) {
      line++;
      column = 1;
      i++;
      continue;
    }
    column++;
    i++;
  }
  return { offset: base.offset + count, line, column };
}
