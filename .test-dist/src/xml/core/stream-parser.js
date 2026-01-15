"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_XML_STREAM_PARSER_OPTIONS = void 0;
exports.parseXmlStream = parseXmlStream;
const error_1 = require("@/xml/core/error");
exports.DEFAULT_XML_STREAM_PARSER_OPTIONS = {
    emitNonContentEvents: false,
    requireSingleRoot: true,
    maxDepth: 4096,
    maxTokens: 1_000_000,
};
function parseXmlStream(tokens, onEvent, options = exports.DEFAULT_XML_STREAM_PARSER_OPTIONS, namePool) {
    // Name pool is optional; only used for error messages if provided.
    const pool = namePool;
    const stack = [];
    let tokenCount = 0;
    // Root tracking (document vs fragment)
    let seenRoot = false;
    let rootClosed = false;
    const fail = (code, offset, message) => {
        throw new error_1.XmlParseError(code, offset, message);
    };
    const nameToString = (id) => {
        if (!pool)
            return `#${id}`;
        return pool.toString(id);
    };
    for (const tok of tokens) {
        tokenCount++;
        if (tokenCount > options.maxTokens) {
            fail("XML_TOKEN_LIMIT", tok.span.start, `Token limit exceeded (${options.maxTokens})`);
        }
        switch (tok.kind) {
            case "text": {
                if (options.requireSingleRoot && stack.length === 0) {
                    if (!seenRoot) {
                        fail("XML_TEXT_BEFORE_ROOT", tok.span.start, "Text is not allowed before the root element");
                    }
                    if (rootClosed) {
                        fail("XML_TEXT_AFTER_ROOT", tok.span.start, "Text is not allowed after the root element");
                    }
                }
                onEvent({ kind: "Text", value: tok.value, span: tok.span });
                break;
            }
            case "comment": {
                if (options.emitNonContentEvents)
                    onEvent({ kind: "Comment", span: tok.span });
                break;
            }
            case "pi": {
                if (options.emitNonContentEvents)
                    onEvent({ kind: "ProcessingInstruction", span: tok.span });
                break;
            }
            case "open": {
                // Root constraints
                if (stack.length === 0) {
                    if (!seenRoot) {
                        seenRoot = true;
                    }
                    else if (options.requireSingleRoot) {
                        fail("XML_MULTIPLE_ROOTS", tok.span.start, "Multiple top-level elements are not allowed");
                    }
                    else if (rootClosed) {
                        // fragment mode: allow more, but track closure
                        rootClosed = false;
                    }
                }
                if (stack.length >= options.maxDepth) {
                    fail("XML_DEPTH_LIMIT", tok.span.start, `Max depth exceeded (${options.maxDepth})`);
                }
                onEvent({
                    kind: "StartElement",
                    name: tok.name,
                    attrs: tok.attrs,
                    selfClosing: tok.selfClosing,
                    span: tok.span,
                });
                if (!tok.selfClosing) {
                    stack.push({ name: tok.name, openSpanStart: tok.span.start });
                }
                else {
                    // Self-closing implies an EndElement immediately
                    onEvent({
                        kind: "EndElement",
                        name: tok.name,
                        span: tok.span,
                    });
                    if (stack.length === 0) {
                        rootClosed = true;
                    }
                }
                break;
            }
            case "close": {
                const frame = stack.pop();
                if (!frame) {
                    fail("XML_UNEXPECTED_CLOSETAG", tok.span.start, `Unexpected close tag </${nameToString(tok.name)}>`);
                }
                else if (frame.name !== tok.name) {
                    fail("XML_TAG_MISMATCH", tok.span.start, `Mismatched close tag </${nameToString(tok.name)}>, expected </${nameToString(frame.name)}>`);
                }
                onEvent({
                    kind: "EndElement",
                    name: tok.name,
                    span: tok.span,
                });
                if (stack.length === 0) {
                    rootClosed = true;
                }
                break;
            }
            default: {
                // Exhaustiveness guard (should never happen)
                const _never = tok;
                void _never;
            }
        }
    }
    if (stack.length > 0) {
        const unclosed = stack[stack.length - 1];
        fail("XML_UNCLOSED_TAGS", unclosed.openSpanStart, `Unclosed tag <${nameToString(unclosed.name)}> (depth=${stack.length})`);
    }
    if (options.requireSingleRoot && !seenRoot) {
        fail("XML_NO_ROOT", 0, "No root element found");
    }
}
