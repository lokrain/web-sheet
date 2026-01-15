import { XmlError } from "@/xml/core/error";
import { offsetToLineColumn } from "@/xml/core/position";
import { XmlNamePool as XmlNamePoolImpl } from "@/xml/core/name-pool";
import {
  DEFAULT_XML_TOKENIZER_OPTIONS,
  type XmlTokenizerOptions,
} from "@/xml/core/options";
import { createTokenizer as createTokenizerImpl, tokenizeXml } from "@/xml/core/tokenizer";
import type { XmlToken } from "@/xml/core/types";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type XmlTokenizer = Readonly<{
  tokenize: (input: string) => Iterable<XmlToken>;
}>;

export type XmlStreamingTokenizer = Readonly<{
  write: (chunk: string | Uint8Array) => Iterable<XmlToken>;
  end: () => Iterable<XmlToken>;
}>;

export function createTokenizer(
  options: Partial<XmlTokenizerOptions> = DEFAULT_XML_TOKENIZER_OPTIONS,
  pool?: XmlNamePool,
): XmlTokenizer {
  const resolved = { ...DEFAULT_XML_TOKENIZER_OPTIONS, ...options };
  const implPool = pool ? (pool as XmlNamePoolImpl) : new XmlNamePoolImpl();
  const impl = createTokenizerImpl(resolved, implPool);
  return {
    tokenize: (input) => tokenizeWithPositions(impl(input), input),
  };
}

export function tokenize(
  input: string,
  options: Partial<XmlTokenizerOptions> = DEFAULT_XML_TOKENIZER_OPTIONS,
  pool?: XmlNamePool,
): Iterable<XmlToken> {
  const implPool = pool ? (pool as XmlNamePoolImpl) : undefined;
  const resolved = { ...DEFAULT_XML_TOKENIZER_OPTIONS, ...options };
  return tokenizeWithPositions(tokenizeXml(input, resolved, implPool), input);
}

export function createStreamingTokenizer(
  options: Partial<XmlTokenizerOptions> = DEFAULT_XML_TOKENIZER_OPTIONS,
  pool?: XmlNamePool,
): XmlStreamingTokenizer {
  const resolved = { ...DEFAULT_XML_TOKENIZER_OPTIONS, ...options };
  const implPool = pool ? (pool as XmlNamePoolImpl) : new XmlNamePoolImpl();
  let buffer = "";
  let baseOffset = 0;
  const decoder = new TextDecoder();

  const tokenizeBuffer = (): { emitted: XmlToken[]; incomplete: boolean } => {
    const emitted: XmlToken[] = [];
    let lastEnd = 0;
    try {
      for (const tok of tokenizeXml(buffer, resolved, implPool)) {
        lastEnd = tok.span.end;
        emitted.push({
          ...tok,
          span: { start: tok.span.start + baseOffset, end: tok.span.end + baseOffset },
        });
      }
      buffer = buffer.slice(lastEnd);
      baseOffset += lastEnd;
      return { emitted, incomplete: false };
    } catch (e) {
      if (e instanceof Error && "code" in e) {
        const code = (e as { code: string }).code;
        if (
          code === "XML_EOF" ||
          code === "XML_TAG_UNTERMINATED" ||
          code === "XML_ATTR_UNTERMINATED" ||
          code === "XML_COMMENT_UNTERMINATED" ||
          code === "XML_PI_UNTERMINATED" ||
          code === "XML_CLOSETAG_GT" ||
          code === "XML_TAG_END" ||
          code === "XML_ATTR_QUOTE" ||
          code === "XML_ATTR_EQ"
        ) {
          buffer = buffer.slice(lastEnd);
          baseOffset += lastEnd;
          return { emitted, incomplete: true };
        }
      }
      throw e;
    }
  };

  return {
    write: (chunk: string | Uint8Array) => {
      if (typeof chunk === "string") {
        buffer += chunk;
      } else if (chunk.length > 0) {
        buffer += decoder.decode(chunk, { stream: true });
      }
      return tokenizeBuffer().emitted;
    },
    end: () => {
      const tail = decoder.decode();
      if (tail.length > 0) buffer += tail;
      if (buffer.length === 0) return [];
      const { emitted, incomplete } = tokenizeBuffer();
      if (incomplete) {
        throw new XmlError(
          "XML_STREAMING_INCOMPLETE",
          { offset: baseOffset + buffer.length },
          "Streaming tokenizer ended with incomplete markup"
        );
      }
      return emitted;
    },
  };
}

export { DEFAULT_XML_TOKENIZER_OPTIONS };
export type { XmlTokenizerOptions };

function* tokenizeWithPositions(
  tokens: Iterable<XmlToken>,
  input: string,
): Iterable<XmlToken> {
  try {
    for (const token of tokens) yield token;
  } catch (e) {
    if (e instanceof XmlError) {
      const { offset } = e.position;
      const lc = offsetToLineColumn(input, offset);
      throw new XmlError(e.code, { offset, line: lc.line, column: lc.column }, e.message, e.context);
    }
    throw e;
  }
}