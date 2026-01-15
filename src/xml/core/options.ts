import type { XmlEntityResolver } from "@/xml/core/entity";

export type XmlTokenizerOptions = Readonly<{
  trimText: boolean;
  skipWhitespaceText: boolean;
  decodeEntities: boolean;
  emitNonContentEvents: boolean;

  // DTD is always rejected; there is no option to enable it.
  entityResolver?: XmlEntityResolver;
}>;

export const DEFAULT_XML_TOKENIZER_OPTIONS = {
  trimText: true,
  skipWhitespaceText: true,
  decodeEntities: true,
  emitNonContentEvents: false,
} satisfies XmlTokenizerOptions;
