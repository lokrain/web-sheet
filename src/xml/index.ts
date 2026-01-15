// src/xml/index.ts

// factories
export { createTokenizer, tokenize } from "@/xml/public/tokenizer";
export { createStreamParser, parseEvents } from "@/xml/public/parser";
export { createNamePool } from "@/xml/public/name-pool";

// adapters
export { createDomlessTreeBuilder } from "@/xml/public/domless-tree";
export {
  compilePathString,
  compileSelector,
  createPathSelector,
} from "@/xml/public/path-selector";

// types
export type {
  Attr,
  NameId,
  XmlEvent,
  XmlEventKind,
  XmlParserOptions,
  XmlPosition,
  XmlToken,
  XmlTokenKind,
  XmlTokenizerOptions,
} from "@/xml/public/types";
export {
  createAttr,
  createCloseToken,
  createCommentToken,
  createOpenToken,
  createProcessingInstructionToken,
  createSpan,
  createTextToken,
} from "@/xml/public/types";
export type { LineColumn, SpanLineColumn } from "@/xml/public/position";
export type { XmlNamePool } from "@/xml/public/name-pool";
export type { DomlessTreeBuilder, XmlElementNode, XmlNode, XmlTextNode } from "@/xml/public/domless-tree";
export type { CompiledSelector, PathSpec, PathSelector, SelectorContext } from "@/xml/public/path-selector";

// errors
export { XmlError } from "@/xml/public/error";

// options and helpers
export { DEFAULT_XML_TOKENIZER_OPTIONS } from "@/xml/public/tokenizer";
export { DEFAULT_XML_STREAM_PARSER_OPTIONS } from "@/xml/public/parser";
export { offsetToLineColumn, spanToLineColumn } from "@/xml/public/position";
