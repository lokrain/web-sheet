export type LineColumn = Readonly<{
  line: number;
  column: number;
}>;

export type SpanLineColumn = Readonly<{
  start: LineColumn;
  end: LineColumn;
}>;

const assertNonNegativeInt = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
};

export function offsetToLineColumn(input: string, offset: number): LineColumn {
  assertNonNegativeInt(offset, "offset");
  const safeOffset = Math.min(offset, input.length);

  let line = 1;
  let column = 1;

  for (let i = 0; i < safeOffset; i++) {
    const cc = input.charCodeAt(i);
    if (cc === 13) {
      // CR or CRLF
      if (i + 1 < safeOffset && input.charCodeAt(i + 1) === 10) {
        i++;
      }
      line++;
      column = 1;
      continue;
    }
    if (cc === 10) {
      line++;
      column = 1;
      continue;
    }
    column++;
  }

  return { line, column };
}

export function spanToLineColumn(input: string, span: { start: number; end: number }): SpanLineColumn {
  return {
    start: offsetToLineColumn(input, span.start),
    end: offsetToLineColumn(input, span.end),
  };
}
