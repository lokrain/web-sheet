import { XmlParseError } from "@/xml/core/error";
import type { XmlNamePool } from "@/xml/core/name-pool";
import type { NameId, XmlToken } from "@/xml/core/types";

export type XmlEvent =
  | Readonly<{
      kind: "StartElement";
      name: NameId;
      attrs: readonly Readonly<{ name: NameId; value: string }>[];
      selfClosing: boolean;
      span: Readonly<{ start: number; end: number }>;
    }>
  | Readonly<{
      kind: "EndElement";
      name: NameId;
      span: Readonly<{ start: number; end: number }>;
    }>
  | Readonly<{
      kind: "Text";
      value: string;
      span: Readonly<{ start: number; end: number }>;
    }>
  | Readonly<{
      kind: "Comment";
      span: Readonly<{ start: number; end: number }>;
    }>
  | Readonly<{
      kind: "ProcessingInstruction";
      span: Readonly<{ start: number; end: number }>;
    }>;

export type XmlEventHandler = (evt: XmlEvent) => void;

export type XmlStreamParserOptions = Readonly<{
  /**
   * If true, emits non-content events (comment, PI) as XmlEvent.
   * Otherwise those tokens are ignored (faster).
   */
  emitNonContentEvents: boolean;

  /**
   * If true, requires exactly one root element (well-formed document).
   * If false, allows multiple top-level elements (XML fragments).
   */
  requireSingleRoot: boolean;

  /**
   * Upper bound for nesting depth to prevent pathological inputs.
   */
  maxDepth: number;

  /**
   * Upper bound for total tokens processed to prevent pathological inputs.
   */
  maxTokens: number;
}>;

export const DEFAULT_XML_STREAM_PARSER_OPTIONS: XmlStreamParserOptions = {
  emitNonContentEvents: false,
  requireSingleRoot: true,
  maxDepth: 4096,
  maxTokens: 1_000_000,
} as const;

type StackFrame = {
  name: NameId;
  openSpanStart: number;
};

export class StreamParserImpl {
  private readonly stack: StackFrame[] = [];
  private tokenCount = 0;
  private seenRoot = false;
  private rootClosed = false;

  constructor(
    private readonly options: XmlStreamParserOptions = DEFAULT_XML_STREAM_PARSER_OPTIONS,
    private readonly pool?: XmlNamePool,
  ) {}

  private fail(code: string, offset: number, message: string): never {
    throw new XmlParseError(code, offset, message);
  }

  private nameToString(id: NameId): string {
    if (!this.pool) return `#${id as unknown as number}`;
    return this.pool.toString(id);
  }

  public write(token: XmlToken): XmlEvent[] {
    this.tokenCount++;
    if (this.tokenCount > this.options.maxTokens) {
      this.fail(
        "XML_TOKEN_LIMIT",
        token.span.start,
        `Token limit exceeded (${this.options.maxTokens})`,
      );
    }

    switch (token.kind) {
      case "text": {
        if (this.options.requireSingleRoot && this.stack.length === 0) {
          if (!this.seenRoot) {
            this.fail(
              "XML_TEXT_BEFORE_ROOT",
              token.span.start,
              "Text is not allowed before the root element",
            );
          }
          if (this.rootClosed) {
            this.fail(
              "XML_TEXT_AFTER_ROOT",
              token.span.start,
              "Text is not allowed after the root element",
            );
          }
        }
        return [{ kind: "Text", value: token.value, span: token.span }];
      }

      case "comment": {
        if (!this.options.emitNonContentEvents) return [];
        return [{ kind: "Comment", span: token.span }];
      }

      case "pi": {
        if (!this.options.emitNonContentEvents) return [];
        return [{ kind: "ProcessingInstruction", span: token.span }];
      }

      case "open": {
        if (this.stack.length === 0) {
          if (!this.seenRoot) {
            this.seenRoot = true;
          } else if (this.options.requireSingleRoot) {
            this.fail(
              "XML_MULTIPLE_ROOTS",
              token.span.start,
              "Multiple top-level elements are not allowed",
            );
          } else if (this.rootClosed) {
            this.rootClosed = false;
          }
        }

        if (this.stack.length >= this.options.maxDepth) {
          this.fail(
            "XML_DEPTH_LIMIT",
            token.span.start,
            `Max depth exceeded (${this.options.maxDepth})`,
          );
        }

        const events: XmlEvent[] = [
          {
            kind: "StartElement",
            name: token.name,
            attrs: token.attrs,
            selfClosing: token.selfClosing,
            span: token.span,
          },
        ];

        if (!token.selfClosing) {
          this.stack.push({ name: token.name, openSpanStart: token.span.start });
        } else {
          events.push({
            kind: "EndElement",
            name: token.name,
            span: token.span,
          });
          if (this.stack.length === 0) this.rootClosed = true;
        }

        return events;
      }

      case "close": {
        const frame = this.stack.pop();
        if (!frame) {
          this.fail(
            "XML_UNEXPECTED_CLOSETAG",
            token.span.start,
            `Unexpected close tag </${this.nameToString(token.name)}>`
          );
        } else if (frame.name !== token.name) {
          this.fail(
            "XML_TAG_MISMATCH",
            token.span.start,
            `Mismatched close tag </${this.nameToString(token.name)}>, expected </${this.nameToString(frame.name)}>`
          );
        }

        const evt: XmlEvent = {
          kind: "EndElement",
          name: token.name,
          span: token.span,
        };

        if (this.stack.length === 0) this.rootClosed = true;
        return [evt];
      }

      default: {
        const _never: never = token;
        void _never;
        return [];
      }
    }
  }

  public writeAll(tokens: Iterable<XmlToken>): XmlEvent[] {
    const out: XmlEvent[] = [];
    for (const t of tokens) out.push(...this.write(t));
    return out;
  }

  public end(): XmlEvent[] {
    if (this.stack.length > 0) {
      const unclosed = this.stack[this.stack.length - 1];
      this.fail(
        "XML_UNCLOSED_TAGS",
        unclosed.openSpanStart,
        `Unclosed tag <${this.nameToString(unclosed.name)}> (depth=${this.stack.length})`,
      );
    }

    if (this.options.requireSingleRoot && !this.seenRoot) {
      this.fail("XML_NO_ROOT", 0, "No root element found");
    }

    return [];
  }
}

export function parseXmlStream(
  tokens: Iterable<XmlToken>,
  onEvent: XmlEventHandler,
  options: XmlStreamParserOptions = DEFAULT_XML_STREAM_PARSER_OPTIONS,
  namePool?: XmlNamePool,
): void {
  const parser = new StreamParserImpl(options, namePool);
  for (const tok of tokens) {
    const events = parser.write(tok);
    for (let i = 0; i < events.length; i++) onEvent(events[i]);
  }
  parser.end();
}
