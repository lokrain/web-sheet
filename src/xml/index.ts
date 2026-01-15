// src/xml/index.ts

export type {
  DomlessTreeBuilder,
  XmlElementNode,
  XmlNode,
  XmlTextNode,
} from "@/xml/public/domless-tree";
// adapters
export { createDomlessTreeBuilder } from "@/xml/public/domless-tree";
// errors
export { XmlError } from "@/xml/public/error";
export { getEventSignature } from "@/xml/public/event-signature";
export type { XmlNamePool } from "@/xml/public/name-pool";
export { createNamePool } from "@/xml/public/name-pool";
export {
  createStreamParser,
  createTextCoalescer,
  DEFAULT_XML_STREAM_PARSER_OPTIONS,
  parseEvents,
  parseEventsCollect,
  parseFragment,
} from "@/xml/public/parser";
export type {
  CompiledSelector,
  PathSelector,
  PathSpec,
  SelectorContext,
} from "@/xml/public/path-selector";
export {
  compilePathString,
  compileSelector,
  createPathSelector,
} from "@/xml/public/path-selector";
export type { ParseEventsOptions } from "@/xml/public/streaming";
export {
  parseEventsFromAsyncIterable,
  parseEventsFromNodeReadable,
  parseEventsFromString,
  parseEventsIterable,
  parseEventsToSink,
  parseEventsToSinkSync,
} from "@/xml/public/streaming";
// factories
// options and helpers
export {
  createStreamingTokenizer,
  createTokenizer,
  DEFAULT_XML_TOKENIZER_OPTIONS,
  tokenize,
} from "@/xml/public/tokenizer";
// types
export type {
  Attr,
  NameId,
  XmlEvent,
  XmlEventKind,
  XmlParserOptions,
  XmlPosition,
  XmlToken,
  XmlTokenizerOptions,
  XmlTokenKind,
} from "@/xml/public/types";
