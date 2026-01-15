// DOM-less tree builder (src/xml/adapters/domless-tree-builder.ts)

import { XmlError } from "@/xml/core/error";
import type { XmlEvent } from "@/xml/core/stream-parser";
import type { NameId, Span } from "@/xml/core/types";

/**
 * A minimal, DOM-less tree representation.
 *
 * Design goals:
 * - Zero XML semantics beyond structure
 * - No parent pointers (stack-driven build)
 * - No mixed-content normalization (consumer decides)
 * - Low allocation, cache-friendly arrays
 * - Generic: usable for any XML-derived domain
 */

export type XmlNode = XmlElementNode | XmlTextNode;

export type XmlElementNode = Readonly<{
  kind: "Element";
  name: NameId;
  attrs: readonly Readonly<{ name: NameId; value: string }>[];
  children: readonly XmlNode[];
  span: Span;
}>;

export type XmlTextNode = Readonly<{
  kind: "Text";
  value: string;
  span: Span;
}>;

/**
 * Builder is intentionally stateful but externally pure:
 * - feed events in order
 * - read the result once at the end
 */
export class DomlessTreeBuilder {
  private readonly stack: {
    name: NameId;
    attrs: readonly Readonly<{ name: NameId; value: string }>[];
    children: XmlNode[];
    start: number;
    startLine?: number;
    startColumn?: number;
  }[] = [];

  private roots: XmlNode[] = [];

  public onEvent(evt: XmlEvent): void {
    switch (evt.kind) {
      case "StartElement": {
        this.stack.push({
          name: evt.name,
          attrs: evt.attrs,
          children: [],
          start: evt.span.start,
          startLine: evt.span.startLine,
          startColumn: evt.span.startColumn,
        });
        break;
      }

      case "EndElement": {
        const frame = this.stack.pop();
        if (!frame) {
          throw new XmlError(
            "XML_INTERNAL",
            { offset: 0, line: 1, column: 1 },
            "DomlessTreeBuilder: EndElement with empty stack",
          );
        }

        const node: XmlElementNode = {
          kind: "Element",
          name: frame.name,
          attrs: frame.attrs,
          children: frame.children,
          span: {
            start: frame.start,
            end: evt.span.end,
            startLine: frame.startLine,
            startColumn: frame.startColumn,
            endLine: evt.span.endLine,
            endColumn: evt.span.endColumn,
          },
        };

        if (this.stack.length > 0) {
          this.stack[this.stack.length - 1].children.push(node);
        } else {
          this.roots.push(node);
        }
        break;
      }

      case "Text": {
        const node: XmlTextNode = {
          kind: "Text",
          value: evt.value,
          span: evt.span,
        };

        if (this.stack.length > 0) {
          this.stack[this.stack.length - 1].children.push(node);
        } else {
          this.roots.push(node);
        }
        break;
      }

      // Non-content events are ignored by design.
      case "Comment":
      case "ProcessingInstruction":
        break;

      default: {
        // Exhaustiveness guard
        const _never: never = evt;
        void _never;
      }
    }
  }

  /**
   * Returns the completed forest (1 node for documents, many for fragments).
   * Calling this before the stream ends is a logic error.
   */
  public getResult(): readonly XmlNode[] {
    if (this.stack.length !== 0) {
      throw new XmlError(
        "XML_INTERNAL",
        { offset: 0, line: 1, column: 1 },
        `DomlessTreeBuilder: unfinished tree, ${this.stack.length} open elements remain`,
      );
    }
    return this.roots;
  }

  /**
   * Clears all internal state so the builder can be reused.
   */
  public reset(): void {
    this.stack.length = 0;
    this.roots = [];
  }
}
