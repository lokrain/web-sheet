import { XmlNamePool } from "@/xml/core/name-pool";
import {
  DEFAULT_XML_TOKENIZER_OPTIONS,
  type XmlTokenizerOptions,
} from "@/xml/core/options";
import type {
  XmlEvent,
  XmlStreamParserOptions,
} from "@/xml/core/stream-parser";
import {
  DEFAULT_XML_STREAM_PARSER_OPTIONS,
  parseXmlStream,
} from "@/xml/core/stream-parser";
import { tokenizeXml } from "@/xml/core/tokenizer";

export type ParseXmlOptions = Readonly<{
  tokenizer?: Partial<XmlTokenizerOptions>;
  parser?: Partial<XmlStreamParserOptions>;
  pool?: XmlNamePool;
}>;

export function parseXml(
  input: string,
  options: ParseXmlOptions = {},
): { pool: XmlNamePool; events: XmlEvent[] } {
  const pool = options.pool ?? new XmlNamePool();
  const tOpts: XmlTokenizerOptions = {
    ...DEFAULT_XML_TOKENIZER_OPTIONS,
    ...(options.tokenizer ?? {}),
  };
  const pOpts: XmlStreamParserOptions = {
    ...DEFAULT_XML_STREAM_PARSER_OPTIONS,
    ...(options.parser ?? {}),
  };

  const events: XmlEvent[] = [];
  parseXmlStream(
    tokenizeXml(input, tOpts, pool),
    (e) => events.push(e),
    pOpts,
    pool,
  );
  return { pool, events };
}
