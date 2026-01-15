import type { XmlPosition as CoreXmlPosition } from "@/xml/core/error";
import type { XmlTokenizerOptions as CoreXmlTokenizerOptions } from "@/xml/core/options";
import type {
  XmlEvent as CoreXmlEvent,
  XmlStreamParserOptions as CoreXmlStreamParserOptions,
} from "@/xml/core/stream-parser";
import type {
  Attr as CoreAttr,
  NameId as CoreNameId,
  XmlToken as CoreXmlToken,
} from "@/xml/core/types";
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
export type XmlPosition = CoreXmlPosition;
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
