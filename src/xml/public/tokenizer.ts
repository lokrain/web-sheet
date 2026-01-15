import { XmlError } from "@/xml/core/error";
import { XmlNamePool as XmlNamePoolImpl } from "@/xml/core/name-pool";
import {
  DEFAULT_XML_TOKENIZER_OPTIONS,
  type XmlTokenizerOptions,
} from "@/xml/core/options";
import {
  createTokenizer as createTokenizerImpl,
  tokenizeXml,
} from "@/xml/core/tokenizer";
import type { XmlToken } from "@/xml/core/types";
import { advancePosition } from "@/xml/internal/position";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type XmlTokenizer = Readonly<{
  tokenize: (input: string) => Iterable<XmlToken>;
}>;

export type XmlStreamingTokenizer = Readonly<{
  write: (chunk: string | Uint8Array, emit: (token: XmlToken) => void) => void;
  end: (emit: (token: XmlToken) => void) => void;
}>;

export function createTokenizer(
  options: Partial<XmlTokenizerOptions> = DEFAULT_XML_TOKENIZER_OPTIONS,
  pool?: XmlNamePool,
): XmlTokenizer {
  const resolved = { ...DEFAULT_XML_TOKENIZER_OPTIONS, ...options };
  const implPool = pool ? (pool as XmlNamePoolImpl) : new XmlNamePoolImpl();
  const impl = createTokenizerImpl(resolved, implPool);
  return {
    tokenize: (input) => impl(input),
  };
}

export function tokenize(
  input: string,
  options: Partial<XmlTokenizerOptions> = DEFAULT_XML_TOKENIZER_OPTIONS,
  pool?: XmlNamePool,
): Iterable<XmlToken> {
  const implPool = pool ? (pool as XmlNamePoolImpl) : undefined;
  const resolved = { ...DEFAULT_XML_TOKENIZER_OPTIONS, ...options };
  return tokenizeXml(input, resolved, implPool);
}

export function createStreamingTokenizer(
  options: Partial<XmlTokenizerOptions> = DEFAULT_XML_TOKENIZER_OPTIONS,
  pool?: XmlNamePool,
): XmlStreamingTokenizer {
  const resolved = { ...DEFAULT_XML_TOKENIZER_OPTIONS, ...options };
  const implPool = pool ? (pool as XmlNamePoolImpl) : new XmlNamePoolImpl();
  let buffer = "";
  let basePosition = { offset: 0, line: 1, column: 1 };
  const decoder = new TextDecoder();

  const tokenizeBuffer = (
    emit: (token: XmlToken) => void,
    deferTrailingText: boolean,
  ): { incomplete: boolean; consumed: number } => {
    let lastEnd = 0;
    let pending: XmlToken | null = null;
    try {
      for (const tok of tokenizeXml(buffer, resolved, implPool, basePosition)) {
        lastEnd = tok.span.end - basePosition.offset;
        if (pending) emit(pending);
        pending = tok;
      }

      if (
        deferTrailingText &&
        pending &&
        pending.kind === "text" &&
        pending.span.end - basePosition.offset === buffer.length
      ) {
        const pendingStart = pending.span.start - basePosition.offset;
        return { incomplete: false, consumed: pendingStart };
      }

      if (pending) emit(pending);
      return { incomplete: false, consumed: lastEnd };
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
          code === "XML_ATTR_EQ" ||
          code === "XML_ENTITY_UNTERMINATED"
        ) {
          if (pending) {
            emit(pending);
            lastEnd = pending.span.end - basePosition.offset;
          }
          return { incomplete: true, consumed: lastEnd };
        }
      }
      throw e;
    }
  };

  return {
    write: (chunk: string | Uint8Array, emit: (token: XmlToken) => void) => {
      if (typeof chunk === "string") {
        buffer += chunk;
      } else if (chunk.length > 0) {
        buffer += decoder.decode(chunk, { stream: true });
      }
      const { consumed } = tokenizeBuffer(emit, true);
      if (consumed > 0) {
        const consumedText = buffer.slice(0, consumed);
        buffer = buffer.slice(consumed);
        basePosition = advancePosition(basePosition, consumedText, consumed);
      }
    },
    end: (emit: (token: XmlToken) => void) => {
      const tail = decoder.decode();
      if (tail.length > 0) buffer += tail;
      if (buffer.length === 0) return;
      const { incomplete, consumed } = tokenizeBuffer(emit, false);
      if (incomplete) {
        const endPos = advancePosition(basePosition, buffer, buffer.length);
        throw new XmlError(
          "XML_STREAMING_INCOMPLETE",
          endPos,
          "Streaming tokenizer ended with incomplete markup",
        );
      }
      if (consumed > 0) {
        const consumedText = buffer.slice(0, consumed);
        buffer = buffer.slice(consumed);
        basePosition = advancePosition(basePosition, consumedText, consumed);
      }
    },
  };
}

export { DEFAULT_XML_TOKENIZER_OPTIONS };
export type { XmlTokenizerOptions };
