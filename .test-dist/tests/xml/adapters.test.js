"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const xml_1 = require("@/xml");
(0, node_test_1.test)("DomlessTreeBuilder builds a simple tree", () => {
    const { pool, events } = (0, xml_1.collectEvents)("<root><a>hi</a><b/></root>");
    const b = new xml_1.DomlessTreeBuilder();
    for (const e of events)
        b.onEvent(e);
    const roots = b.getResult();
    strict_1.default.equal(roots.length, 1);
    const root = roots[0];
    strict_1.default.equal(root.kind, "Element");
    strict_1.default.equal(pool.toString(root.kind === "Element" ? root.name : 0), "root");
    if (root.kind !== "Element")
        throw new Error("expected element");
    strict_1.default.equal(root.children.length, 2);
    strict_1.default.equal(root.children[0].kind, "Element");
    strict_1.default.equal(root.children[1].kind, "Element");
});
(0, node_test_1.test)("DomlessTreeBuilder throws on unfinished stack", () => {
    const pool = new xml_1.XmlNamePool();
    const root = pool.intern("root");
    const b = new xml_1.DomlessTreeBuilder();
    b.onEvent({
        kind: "StartElement",
        name: root,
        attrs: [],
        selfClosing: false,
        span: { start: 0, end: 6 },
    });
    strict_1.default.throws(() => b.getResult(), /unfinished tree/);
});
(0, node_test_1.test)("PathSelector calls handlers for exact absolute path", () => {
    const pool = new xml_1.XmlNamePool();
    const hit = [];
    const path = (0, xml_1.compilePathString)("root/a", pool);
    const { onEvent } = (0, xml_1.createPathSelector)([
        {
            path,
            onEnter: (ctx) => hit.push(`enter:${ctx.nameToString(ctx.name)}:${ctx.depth}`),
            onExit: (ctx) => hit.push(`exit:${ctx.nameToString(ctx.name)}:${ctx.depth}`),
            onText: (_ctx, t) => hit.push(`text:${t}`),
        },
    ], pool);
    const { events } = (0, xml_1.collectEvents)("<root><a>hi</a><b><a>no</a></b></root>", undefined, undefined);
    for (const e of events)
        onEvent(e);
    // Should match only root/a, not root/b/a
    strict_1.default.deepEqual(hit, ["enter:a:2", "text:hi", "exit:a:2"]);
});
(0, node_test_1.test)("PathSelector can capture subtree text", () => {
    const pool = new xml_1.XmlNamePool();
    const captured = [];
    const path = (0, xml_1.compilePathString)("root/b", pool);
    const { onEvent } = (0, xml_1.createPathSelector)([
        {
            path,
            textCaptureSubtree: true,
            onText: (_ctx, t) => captured.push(t),
        },
    ], pool);
    const { events } = (0, xml_1.collectEvents)("<root><b><a>one</a><c>two</c></b></root>");
    for (const e of events)
        onEvent(e);
    strict_1.default.deepEqual(captured, ["one", "two"]);
});
