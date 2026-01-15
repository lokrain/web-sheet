import { XmlParseError } from "@/xml/core/error";
import type { XmlNamePool } from "@/xml/core/name-pool";
import type { NameId, Span, XmlToken } from "@/xml/core/types";

export type XmlEvent =
  | Readonly<{
      kind: "StartElement";
      name: NameId;
      attrs: readonly Readonly<{ name: NameId; value: string }>[];
      selfClosing: boolean;
      span: Span;
    }>
  | Readonly<{
      kind: "EndElement";
      name: NameId;
      span: Span;
    }>
  | Readonly<{
      kind: "Text";
      value: string;
      span: Span;
    }>
  | Readonly<{
      kind: "Comment";
      span: Span;
    }>
  | Readonly<{
      kind: "ProcessingInstruction";
      span: Span;
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

export const DEFAULT_XML_STREAM_PARSER_OPTIONS: XmlStreamParserOptions = Object.freeze({
  emitNonContentEvents: false,
  requireSingleRoot: true,
  maxDepth: 4096,
  maxTokens: 1_000_000,
});

type StackFrame = {
  name: NameId;
  openSpanStart: number;
  openSpanLine: number;
  openSpanColumn: number;
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

  private fail(
    code: string,
    position: { offset: number; line: number; column: number },
    message: string,
  ): never {
    throw new XmlParseError(code, position, message);
  }

  private spanStartPosition(span: { start: number; startLine?: number; startColumn?: number }): {
    offset: number;
    line: number;
    column: number;
  } {
    return {
      offset: span.start,
      line: span.startLine ?? 1,
      column: span.startColumn ?? 1,
    };
  }

  private nameToString(id: NameId): string {
    if (!this.pool) return `#${id as unknown as number}`;
    return this.pool.toString(id);
  }

  public write(token: XmlToken, emit: XmlEventHandler): void {
    this.tokenCount++;
    if (this.tokenCount > this.options.maxTokens) {
      this.fail(
        "XML_TOKEN_LIMIT",
        this.spanStartPosition(token.span),
        `Token limit exceeded (${this.options.maxTokens})`,
      );
    }

    switch (token.kind) {
      case "text": {
        if (this.options.requireSingleRoot && this.stack.length === 0) {
          if (!this.seenRoot) {
            this.fail(
              "XML_TEXT_BEFORE_ROOT",
              this.spanStartPosition(token.span),
              "Text is not allowed before the root element",
            );
          }
          if (this.rootClosed) {
            this.fail(
              "XML_TEXT_AFTER_ROOT",
              this.spanStartPosition(token.span),
              "Text is not allowed after the root element",
            );
          }
        }
        emit({ kind: "Text", value: token.value, span: token.span });
        return;
      }

      case "comment": {
        if (!this.options.emitNonContentEvents) return;
        emit({ kind: "Comment", span: token.span });
        return;
      }

      case "pi": {
        if (!this.options.emitNonContentEvents) return;
        emit({ kind: "ProcessingInstruction", span: token.span });
        return;
      }

      case "open": {
        if (this.stack.length === 0) {
          if (!this.seenRoot) {
            this.seenRoot = true;
          } else if (this.options.requireSingleRoot) {
            this.fail(
              "XML_MULTIPLE_ROOTS",
              this.spanStartPosition(token.span),
              "Multiple top-level elements are not allowed",
            );
          } else if (this.rootClosed) {
            this.rootClosed = false;
          }
        }

        if (this.stack.length >= this.options.maxDepth) {
          this.fail(
            "XML_DEPTH_LIMIT",
            this.spanStartPosition(token.span),
            `Max depth exceeded (${this.options.maxDepth})`,
          );
        }

        emit({
          kind: "StartElement",
          name: token.name,
          attrs: token.attrs,
          selfClosing: token.selfClosing,
          span: token.span,
        });

        if (!token.selfClosing) {
          this.stack.push({
            name: token.name,
            openSpanStart: token.span.start,
            openSpanLine: token.span.startLine ?? 1,
            openSpanColumn: token.span.startColumn ?? 1,
          });
        } else {
          emit({
            kind: "EndElement",
            name: token.name,
            span: token.span,
          });
          if (this.stack.length === 0) this.rootClosed = true;
        }
        return;
      }

      case "close": {
        const frame = this.stack.pop();
        if (!frame) {
          this.fail(
            "XML_UNEXPECTED_CLOSETAG",
            this.spanStartPosition(token.span),
            `Unexpected close tag </${this.nameToString(token.name)}>`
          );
        } else if (frame.name !== token.name) {
          this.fail(
            "XML_TAG_MISMATCH",
            this.spanStartPosition(token.span),
            `Mismatched close tag </${this.nameToString(token.name)}>, expected </${this.nameToString(frame.name)}>`
          );
        }

        emit({ kind: "EndElement", name: token.name, span: token.span });

        if (this.stack.length === 0) this.rootClosed = true;
        return;
      }

      default: {
        const _never: never = token;
        void _never;
        return;
      }
    }
  }

  public writeAll(tokens: Iterable<XmlToken>, emit: XmlEventHandler): void {
    for (const t of tokens) this.write(t, emit);
  }

  public end(): void {
    if (this.stack.length > 0) {
      const unclosed = this.stack[this.stack.length - 1];
      this.fail(
        "XML_UNCLOSED_TAGS",
        {
          offset: unclosed.openSpanStart,
          line: unclosed.openSpanLine,
          column: unclosed.openSpanColumn,
        },
        `Unclosed tag <${this.nameToString(unclosed.name)}> (depth=${this.stack.length})`,
      );
    }

    if (this.options.requireSingleRoot && !this.seenRoot) {
      this.fail("XML_NO_ROOT", { offset: 0, line: 1, column: 1 }, "No root element found");
    }
  }
}

export function parseXmlStream(
  tokens: Iterable<XmlToken>,
  onEvent: XmlEventHandler,
  options: XmlStreamParserOptions = DEFAULT_XML_STREAM_PARSER_OPTIONS,
  namePool?: XmlNamePool,
): void {
  const parser = new StreamParserImpl(options, namePool);
  for (const tok of tokens) parser.write(tok, onEvent);
  parser.end();
}
