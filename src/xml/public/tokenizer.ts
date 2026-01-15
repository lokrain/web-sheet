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

export function createTokenizer(
  options: XmlTokenizerOptions = DEFAULT_XML_TOKENIZER_OPTIONS,
  pool?: XmlNamePool,
): XmlTokenizer {
  const implPool = pool ? (pool as XmlNamePoolImpl) : new XmlNamePoolImpl();
  const impl = createTokenizerImpl(options, implPool);
  return {
    tokenize: (input) => impl(input),
  };
}

export function tokenize(
  input: string,
  options: XmlTokenizerOptions = DEFAULT_XML_TOKENIZER_OPTIONS,
  pool?: XmlNamePool,
): Iterable<XmlToken> {
  const implPool = pool ? (pool as XmlNamePoolImpl) : undefined;
  return tokenizeXml(input, options, implPool);
}

export { DEFAULT_XML_TOKENIZER_OPTIONS };
export type { XmlTokenizerOptions };