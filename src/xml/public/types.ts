import type {
  Attr as CoreAttr,
  NameId as CoreNameId,
  Span as CoreSpan,
  XmlToken as CoreXmlToken,
} from "@/xml/core/types";
import type { XmlEvent as CoreXmlEvent } from "@/xml/core/stream-parser";
import type { XmlTokenizerOptions as CoreXmlTokenizerOptions } from "@/xml/core/options";
import type { XmlStreamParserOptions as CoreXmlStreamParserOptions } from "@/xml/core/stream-parser";
import {
  createAttr,
  createCloseToken,
  createCommentToken,
  createOpenToken,
  createProcessingInstructionToken,
  createSpan,
  createTextToken,
} from "@/xml/core/types";

export type XmlToken = CoreXmlToken;
export type XmlEvent = CoreXmlEvent;
export type XmlPosition = CoreSpan;
export type Attr = CoreAttr;
export type NameId = CoreNameId;
export type XmlTokenizerOptions = CoreXmlTokenizerOptions;
export type XmlParserOptions = CoreXmlStreamParserOptions;
export type XmlTokenKind = XmlToken["kind"];
export type XmlEventKind = XmlEvent["kind"];

export {
  createAttr,
  createCloseToken,
  createCommentToken,
  createOpenToken,
  createProcessingInstructionToken,
  createSpan,
  createTextToken,
};