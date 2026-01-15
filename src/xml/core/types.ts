import { XmlError } from "@/xml/core/error";

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type NameId = Brand<number, "NameId">;

export type Span = Readonly<{
  start: number;
  end: number;
}>;

export type Attr = Readonly<{
  name: NameId;
  value: string;
}>;

export type XmlToken =
  | Readonly<{ kind: "text"; value: string; span: Span }>
  | Readonly<{
      kind: "open";
      name: NameId;
      attrs: readonly Attr[];
      selfClosing: boolean;
      span: Span;
    }>
  | Readonly<{ kind: "close"; name: NameId; span: Span }>
  | Readonly<{ kind: "comment"; span: Span }>
  | Readonly<{ kind: "pi"; span: Span }>;

const assertNonNegativeInt = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new XmlError(
      "XML_INVALID_SPAN",
      { offset: 0 },
      `${label} must be a non-negative integer`
    );
  }
};

export function createSpan(start: number, end: number): Span {
  assertNonNegativeInt(start, "start");
  assertNonNegativeInt(end, "end");
  if (end < start) {
    throw new XmlError(
      "XML_INVALID_SPAN",
      { offset: 0 },
      `end (${end}) must be >= start (${start})`
    );
  }
  return { start, end };
}

export function createAttr(name: NameId, value: string): Attr {
  return { name, value };
}

export function createTextToken(
  value: string,
  start: number,
  end: number,
): XmlToken {
  return { kind: "text", value, span: createSpan(start, end) };
}

export function createOpenToken(
  name: NameId,
  attrs: readonly Attr[],
  selfClosing: boolean,
  start: number,
  end: number,
): XmlToken {
  const safeAttrs = Object.freeze([...attrs]);
  return {
    kind: "open",
    name,
    attrs: safeAttrs,
    selfClosing,
    span: createSpan(start, end),
  };
}

export function createCloseToken(
  name: NameId,
  start: number,
  end: number,
): XmlToken {
  return { kind: "close", name, span: createSpan(start, end) };
}

export function createCommentToken(start: number, end: number): XmlToken {
  return { kind: "comment", span: createSpan(start, end) };
}

export function createProcessingInstructionToken(
  start: number,
  end: number,
): XmlToken {
  return { kind: "pi", span: createSpan(start, end) };
}
