import {
  DomlessTreeBuilder as DomlessTreeBuilderImpl,
  type XmlElementNode,
  type XmlNode,
  type XmlTextNode,
} from "@/xml/adapters/domless-tree-builder";
import type { XmlEvent } from "@/xml/core/stream-parser";

export type DomlessTreeBuilder = Readonly<{
  onEvent: (evt: XmlEvent) => void;
  getResult: () => readonly XmlNode[];
  reset: () => void;
}>;

export function createDomlessTreeBuilder(): DomlessTreeBuilder {
  const impl = new DomlessTreeBuilderImpl();
  return {
    onEvent: (evt) => impl.onEvent(evt),
    getResult: () => impl.getResult(),
    reset: () => impl.reset(),
  };
}

export type { XmlElementNode, XmlNode, XmlTextNode };
