import type { XmlNamePool as XmlNamePoolImpl } from "@/xml/core/name-pool";
import { parseXml } from "@/xml/core/parse";
import type { XmlEvent, XmlEventHandler } from "@/xml/core/stream-parser";
import {
  DEFAULT_XML_STREAM_PARSER_OPTIONS,
  StreamParserImpl,
  type XmlStreamParserOptions,
} from "@/xml/core/stream-parser";
import type { XmlToken } from "@/xml/core/types";
import type { XmlNamePool } from "@/xml/public/name-pool";
import type { XmlParserOptions, XmlTokenizerOptions } from "@/xml/public/types";

export type XmlStreamParser = Readonly<{
  write: (token: XmlToken, emit: XmlEventHandler) => void;
  writeAll: (tokens: Iterable<XmlToken>, emit: XmlEventHandler) => void;
  end: () => void;
}>;

export function createTextCoalescer(emit: XmlEventHandler): {
  emit: XmlEventHandler;
  flush: () => void;
} {
  let pending: XmlEvent | null = null;
  return {
    emit: (evt) => {
      if (evt.kind === "Text") {
        if (pending && pending.kind === "Text") {
          pending = {
            kind: "Text",
            value: pending.value + evt.value,
            span: {
              start: pending.span.start,
              end: evt.span.end,
              startLine: pending.span.startLine,
              startColumn: pending.span.startColumn,
              endLine: evt.span.endLine,
              endColumn: evt.span.endColumn,
            },
          };
          return;
        }
        pending = evt;
        return;
      }
      if (pending) {
        emit(pending);
        pending = null;
      }
      emit(evt);
    },
    flush: () => {
      if (pending) {
        emit(pending);
        pending = null;
      }
    },
  };
}

export function createStreamParser(
  options: Partial<XmlStreamParserOptions> = DEFAULT_XML_STREAM_PARSER_OPTIONS,
  pool?: XmlNamePool,
): XmlStreamParser {
  const implPool = pool ? (pool as XmlNamePoolImpl) : undefined;
  const resolved = { ...DEFAULT_XML_STREAM_PARSER_OPTIONS, ...options };
  const impl = new StreamParserImpl(resolved, implPool);

  return {
    write: (token, emit) => impl.write(token, emit),
    writeAll: (tokens, emit) => impl.writeAll(tokens, emit),
    end: () => impl.end(),
  };
}

export function parseEvents(
  input: string,
  options?: Readonly<{
    tokenizer?: Partial<XmlTokenizerOptions>;
    parser?: Partial<XmlParserOptions>;
    pool?: XmlNamePool;
  }>,
): { pool: XmlNamePool; events: XmlEvent[] } {
  return parseXml(input, options as never);
}

export function parseFragment(
  input: string,
  options?: Readonly<{
    tokenizer?: Partial<XmlTokenizerOptions>;
    parser?: Partial<XmlParserOptions>;
    pool?: XmlNamePool;
  }>,
): { pool: XmlNamePool; events: XmlEvent[] } {
  const merged = {
    ...options,
    parser: { requireSingleRoot: false, ...(options?.parser ?? {}) },
  };
  return parseXml(input, merged as never);
}

export function parseEventsCollect(
  input: string,
  options?: Readonly<{
    tokenizer?: Partial<XmlTokenizerOptions>;
    parser?: Partial<XmlParserOptions>;
    pool?: XmlNamePool;
  }>,
): { pool: XmlNamePool; events: XmlEvent[] } {
  return parseXml(input, options as never);
}

export { DEFAULT_XML_STREAM_PARSER_OPTIONS };
export type { XmlStreamParserOptions };
