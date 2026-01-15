"use strict";
// DOM-less tree builder (src/xml/adapters/domless-tree-builder.ts)
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomlessTreeBuilder = void 0;
/**
 * Builder is intentionally stateful but externally pure:
 * - feed events in order
 * - read the result once at the end
 */
class DomlessTreeBuilder {
    stack = [];
    roots = [];
    onEvent(evt) {
        switch (evt.kind) {
            case "StartElement": {
                this.stack.push({
                    name: evt.name,
                    attrs: evt.attrs,
                    children: [],
                    start: evt.span.start,
                });
                break;
            }
            case "EndElement": {
                const frame = this.stack.pop();
                if (!frame) {
                    throw new Error("DomlessTreeBuilder: EndElement with empty stack");
                }
                const node = {
                    kind: "Element",
                    name: frame.name,
                    attrs: frame.attrs,
                    children: frame.children,
                    span: { start: frame.start, end: evt.span.end },
                };
                if (this.stack.length > 0) {
                    this.stack[this.stack.length - 1].children.push(node);
                }
                else {
                    this.roots.push(node);
                }
                break;
            }
            case "Text": {
                const node = {
                    kind: "Text",
                    value: evt.value,
                    span: evt.span,
                };
                if (this.stack.length > 0) {
                    this.stack[this.stack.length - 1].children.push(node);
                }
                else {
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
                const _never = evt;
                void _never;
            }
        }
    }
    /**
     * Returns the completed forest (1 node for documents, many for fragments).
     * Calling this before the stream ends is a logic error.
     */
    getResult() {
        if (this.stack.length !== 0) {
            throw new Error(`DomlessTreeBuilder: unfinished tree, ${this.stack.length} open elements remain`);
        }
        return this.roots;
    }
    /**
     * Clears all internal state so the builder can be reused.
     */
    reset() {
        this.stack.length = 0;
        this.roots = [];
    }
}
exports.DomlessTreeBuilder = DomlessTreeBuilder;
