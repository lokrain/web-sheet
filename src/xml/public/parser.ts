import { XmlNamePool as XmlNamePoolImpl } from "@/xml/core/name-pool";
import {
  DEFAULT_XML_STREAM_PARSER_OPTIONS,
  type XmlStreamParserOptions,
  StreamParserImpl,
} from "@/xml/core/stream-parser";
import type { XmlToken } from "@/xml/core/types";
import type { XmlEvent } from "@/xml/core/stream-parser";
import type { XmlNamePool } from "@/xml/public/name-pool";
import { parseXml } from "@/xml/core/parse";
import { XmlError } from "@/xml/core/error";
import { offsetToLineColumn } from "@/xml/core/position";
import type { XmlTokenizerOptions, XmlParserOptions } from "@/xml/public/types";

export type XmlStreamParser = Readonly<{
  write: (tokenOrTokens: XmlToken | Iterable<XmlToken>) => XmlEvent[];
  end: () => XmlEvent[];
}>;

export function createStreamParser(
  options: Partial<XmlStreamParserOptions> = DEFAULT_XML_STREAM_PARSER_OPTIONS,
  pool?: XmlNamePool,
): XmlStreamParser {
  const implPool = pool ? (pool as XmlNamePoolImpl) : undefined;
  const resolved = { ...DEFAULT_XML_STREAM_PARSER_OPTIONS, ...options };
  const impl = new StreamParserImpl(resolved, implPool);

  return {
    write: (tokenOrTokens) => {
      if (Symbol.iterator in Object(tokenOrTokens)) {
        return impl.writeAll(tokenOrTokens as Iterable<XmlToken>);
      }
      return impl.write(tokenOrTokens as XmlToken);
    },
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
  try {
    return parseXml(input, options as never);
  } catch (e) {
    if (e instanceof XmlError) {
      const { offset } = e.position;
      const lc = offsetToLineColumn(input, offset);
      throw new XmlError(e.code, { offset, line: lc.line, column: lc.column }, e.message, e.context);
    }
    throw e;
  }
}

export { DEFAULT_XML_STREAM_PARSER_OPTIONS };
export type { XmlStreamParserOptions };