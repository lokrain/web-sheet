import {
  type Cursor,
  eof,
  expectCharCode,
  indexOfFrom,
  makeCursor,
  nextCharCode,
  peekCharCode,
  slice,
} from "@/xml/core/cursor";
import { decodeXmlEntities } from "@/xml/core/entity";
import { XmlParseError } from "@/xml/core/error";
import { isXmlNameChar, isXmlNameStart } from "@/xml/core/name";
import { XmlNamePool } from "@/xml/core/name-pool";
import {
  DEFAULT_XML_TOKENIZER_OPTIONS,
  type XmlTokenizerOptions,
} from "@/xml/core/options";
import type { Attr, NameId, Span, XmlToken } from "@/xml/core/types";

type Emit = (t: XmlToken) => void;

type Decode = (s: string, baseOffset: number) => string;

type Intern = (name: string) => NameId;

type ScannerEnv = Readonly<{
  opts: XmlTokenizerOptions;
  intern: Intern;
  decode: Decode;
}>;

function isWs(c: number): boolean {
  return c === 32 || c === 9 || c === 10 || c === 13;
}

function skipWs(c: Cursor): void {
  while (!eof(c)) {
    const cc = peekCharCode(c);
    if (cc !== -1 && isWs(cc)) c.i++;
    else break;
  }
}

function readNameString(c: Cursor): string {
  const c0 = peekCharCode(c);
  if (c0 === -1 || !isXmlNameStart(c0)) {
    throw new XmlParseError("XML_NAME_START", c.i, "Invalid XML name start");
  }
  const start = c.i;
  c.i++;
  while (!eof(c)) {
    const cc = peekCharCode(c);
    if (cc !== -1 && isXmlNameChar(cc)) c.i++;
    else break;
  }
  return c.input.slice(start, c.i);
}

function readAttrValue(c: Cursor, env: ScannerEnv): string {
  const q = nextCharCode(c);
  if (q !== 34 && q !== 39)
    throw new XmlParseError(
      "XML_ATTR_QUOTE",
      Math.max(0, c.i - 1),
      "Expected attribute quote",
    );
  const quote = q;
  const start = c.i;

  while (!eof(c)) {
    const cc = nextCharCode(c);
    if (cc === quote) {
      const raw = slice(c, start, c.i - 1);
      return env.decode(raw, start);
    }
  }
  throw new XmlParseError(
    "XML_ATTR_UNTERMINATED",
    start,
    "Unterminated attribute value",
  );
}

function normalizeText(
  raw: string,
  env: ScannerEnv,
  baseOffset: number,
): string | null {
  let t = raw;
  let leadingTrim = 0;
  if (env.opts.trimText) {
    let start = 0;
    let end = t.length;
    while (start < end && isWs(t.charCodeAt(start))) start++;
    while (end > start && isWs(t.charCodeAt(end - 1))) end--;
    leadingTrim = start;
    t = t.slice(start, end);
  }
  if (env.opts.skipWhitespaceText) {
    let allWs = true;
    for (let k = 0; k < t.length; k++) {
      if (!isWs(t.charCodeAt(k))) {
        allWs = false;
        break;
      }
    }
    if (allWs) return null;
  }
  if (t.length === 0) return null;
  return env.decode(t, baseOffset + leadingTrim);
}

function makeSpan(start: number, end: number): Span {
  return { start, end };
}

function scanComment(c: Cursor, start: number, emit: Emit): void {
  const endIdx = indexOfFrom(c, "-->", c.i);
  if (endIdx === -1)
    throw new XmlParseError(
      "XML_COMMENT_UNTERMINATED",
      start,
      "Unterminated comment",
    );
  c.i = endIdx + 3;
  emit({ kind: "comment", span: makeSpan(start, c.i) });
}

function scanPI(c: Cursor, start: number, emit: Emit): void {
  const endIdx = indexOfFrom(c, "?>", c.i);
  if (endIdx === -1)
    throw new XmlParseError(
      "XML_PI_UNTERMINATED",
      start,
      "Unterminated processing instruction",
    );
  c.i = endIdx + 2;
  emit({ kind: "pi", span: makeSpan(start, c.i) });
}

function scanCloseTag(
  c: Cursor,
  start: number,
  env: ScannerEnv,
  emit: Emit,
): void {
  // positioned after "</"
  skipWs(c);
  const nameStr = readNameString(c);
  skipWs(c);
  expectCharCode(c, 62, "XML_CLOSETAG_GT", "Expected '>'");
  const name = env.intern(nameStr);
  emit({ kind: "close", name, span: makeSpan(start, c.i) });
}

function scanOpenTag(
  c: Cursor,
  start: number,
  env: ScannerEnv,
  emit: Emit,
): void {
  // positioned after "<"
  skipWs(c);
  const nameStr = readNameString(c);
  const name = env.intern(nameStr);

  const attrs: Attr[] = [];
  let selfClosing = false;

  while (!eof(c)) {
    skipWs(c);
    const cc = peekCharCode(c);

    if (cc === 47) {
      // "/>"
      c.i++;
      expectCharCode(c, 62, "XML_TAG_END", "Expected '>' after '/'");
      selfClosing = true;
      emit({
        kind: "open",
        name,
        attrs,
        selfClosing,
        span: makeSpan(start, c.i),
      });
      return;
    }

    if (cc === 62) {
      // ">"
      c.i++;
      emit({
        kind: "open",
        name,
        attrs,
        selfClosing,
        span: makeSpan(start, c.i),
      });
      return;
    }

    // attribute
    const attrNameStr = readNameString(c);
    const attrName = env.intern(attrNameStr);
    skipWs(c);
    expectCharCode(c, 61, "XML_ATTR_EQ", "Expected '=' after attribute name");
    skipWs(c);
    const value = readAttrValue(c, env);
    attrs.push({ name: attrName, value });
  }

  throw new XmlParseError(
    "XML_TAG_UNTERMINATED",
    start,
    "Unterminated start tag",
  );
}

function scanMarkup(
  c: Cursor,
  start: number,
  env: ScannerEnv,
  emit: Emit,
): void {
  // we are positioned after '<'
  const cc = peekCharCode(c);
  if (cc === -1)
    throw new XmlParseError("XML_EOF", start, "Unexpected EOF after '<'");

  // comment or doctype
  if (cc === 33) {
    // "<!"
    c.i++;
    if (c.input.startsWith("--", c.i)) {
      c.i += 2; // after "<!--"
      if (!env.opts.emitNonContentEvents) {
        const endIdx = indexOfFrom(c, "-->", c.i);
        if (endIdx === -1)
          throw new XmlParseError(
            "XML_COMMENT_UNTERMINATED",
            start,
            "Unterminated comment",
          );
        c.i = endIdx + 3;
        return;
      }
      scanComment(c, start, emit);
      return;
    }

    // hard reject DTD/DOCTYPE (policy)
    if (
      c.input.startsWith("DOCTYPE", c.i) ||
      c.input.startsWith("doctype", c.i)
    ) {
      throw new XmlParseError(
        "XML_DTD_REJECTED",
        start,
        "DOCTYPE/DTD is rejected by policy",
      );
    }

    // any other "<!...>" is not supported in this core
    throw new XmlParseError(
      "XML_BANG_UNSUPPORTED",
      start,
      "Unsupported markup declaration",
    );
  }

  // processing instruction
  if (cc === 63) {
    // "<?"
    c.i++;
    if (!env.opts.emitNonContentEvents) {
      const endIdx = indexOfFrom(c, "?>", c.i);
      if (endIdx === -1)
        throw new XmlParseError(
          "XML_PI_UNTERMINATED",
          start,
          "Unterminated processing instruction",
        );
      c.i = endIdx + 2;
      return;
    }
    scanPI(c, start, emit);
    return;
  }

  // close tag
  if (cc === 47) {
    c.i++; // after "</"
    scanCloseTag(c, start, env, emit);
    return;
  }

  // open tag
  scanOpenTag(c, start, env, emit);
}

function scanTextSegment(
  c: Cursor,
  until: number,
  env: ScannerEnv,
  emit: Emit,
): void {
  if (until <= c.i) {
    c.i = until;
    return;
  }

  let hasNonWs = false;
  let hasAmp = false;
  for (let i = c.i; i < until; i++) {
    const cc = c.input.charCodeAt(i);
    if (cc === 38) hasAmp = true; // '&'
    if (!isWs(cc)) {
      hasNonWs = true;
      if (!env.opts.skipWhitespaceText && !env.opts.trimText && hasAmp) break;
    }
  }

  if (env.opts.skipWhitespaceText && !hasNonWs) {
    c.i = until;
    return;
  }

  const raw = slice(c, c.i, until);

  if (!env.opts.trimText) {
    if (raw.length > 0) {
      const value = hasAmp ? env.decode(raw, c.i) : raw;
      emit({ kind: "text", value, span: makeSpan(c.i, until) });
    }
    c.i = until;
    return;
  }

  const normalized = normalizeText(raw, env, c.i);
  if (normalized !== null) {
    emit({ kind: "text", value: normalized, span: makeSpan(c.i, until) });
  }
  c.i = until;
}

function makeDecoder(opts: XmlTokenizerOptions): Decode {
  if (!opts.decodeEntities) return (s) => s;
  return (s, base) =>
    s.includes("&") ? decodeXmlEntities(s, base, opts.entityResolver) : s;
}

/**
 * Assembled tokenizer (functional construction):
 * - policies and dependencies injected
 * - scanning broken into testable units
 * - NameId interning supported by default
 */
export function createTokenizer(
  opts: XmlTokenizerOptions,
  pool: XmlNamePool,
): (input: string) => Generator<XmlToken> {
  const env: ScannerEnv = {
    opts,
    intern: (s) => pool.intern(s),
    decode: makeDecoder(opts),
  };

  return function* run(input: string): Generator<XmlToken> {
    const c = makeCursor(input);

    const emitQueue: XmlToken[] = [];
    const emit: Emit = (t) => {
      emitQueue.push(t);
    };

    while (!eof(c)) {
      const lt = indexOfFrom(c, "<", c.i);
      if (lt === -1) {
        if (c.i < c.len) {
          scanTextSegment(c, c.len, env, emit);
          for (let i = 0; i < emitQueue.length; i++) {
            yield emitQueue[i] as XmlToken;
          }
          emitQueue.length = 0;
        }
        return;
      }

      if (lt > c.i) {
        scanTextSegment(c, lt, env, emit);
        for (let i = 0; i < emitQueue.length; i++) {
          yield emitQueue[i] as XmlToken;
        }
        emitQueue.length = 0;
      }

      // consume '<'
      const start = c.i;
      c.i++;

      scanMarkup(c, start, env, emit);
      for (let i = 0; i < emitQueue.length; i++) {
        yield emitQueue[i] as XmlToken;
      }
      emitQueue.length = 0;
    }
  };
}

export function* tokenizeXml(
  input: string,
  options: XmlTokenizerOptions = DEFAULT_XML_TOKENIZER_OPTIONS,
  pool?: XmlNamePool,
): Generator<XmlToken> {
  const namePool = pool ?? new XmlNamePool();
  const tokenizer = createTokenizer(options, namePool);
  yield* tokenizer(input);
}
