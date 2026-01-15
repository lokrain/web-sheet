"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const xml_1 = require("@/xml");
(0, node_test_1.test)("tokenizeXml emits open/close/text with spans", () => {
    const pool = new xml_1.XmlNamePool();
    const input = '<a x="1">hi</a>';
    const tokens = Array.from((0, xml_1.tokenizeXml)(input, xml_1.DEFAULT_XML_TOKENIZER_OPTIONS, pool));
    strict_1.default.equal(tokens[0].kind, "open");
    strict_1.default.equal(pool.toString(tokens[0].kind === "open" ? tokens[0].name : 0), "a");
    strict_1.default.equal(tokens[1].kind, "text");
    strict_1.default.equal(tokens[1].kind === "text" ? tokens[1].value : "", "hi");
    strict_1.default.equal(tokens[2].kind, "close");
    // Basic span sanity
    strict_1.default.equal(tokens[0].span.start, 0);
    strict_1.default.equal(tokens[2].span.end, input.length);
});
(0, node_test_1.test)("tokenizeXml supports self-closing tags", () => {
    const pool = new xml_1.XmlNamePool();
    const tokens = Array.from((0, xml_1.tokenizeXml)("<a/>", xml_1.DEFAULT_XML_TOKENIZER_OPTIONS, pool));
    strict_1.default.equal(tokens.length, 1);
    strict_1.default.equal(tokens[0].kind, "open");
    strict_1.default.equal(tokens[0].kind === "open" ? tokens[0].selfClosing : false, true);
});
(0, node_test_1.test)("tokenizeXml decodes entities in text", () => {
    const pool = new xml_1.XmlNamePool();
    const tokens = Array.from((0, xml_1.tokenizeXml)("<a>&lt;</a>", xml_1.DEFAULT_XML_TOKENIZER_OPTIONS, pool));
    strict_1.default.equal(tokens[1].kind, "text");
    strict_1.default.equal(tokens[1].kind === "text" ? tokens[1].value : "", "<");
});
(0, node_test_1.test)("tokenizeXml reports correct offset for entity errors after leading trim", () => {
    const pool = new xml_1.XmlNamePool();
    // Leading whitespace is trimmed, but the entity starts at offset 2.
    strict_1.default.throws(() => Array.from((0, xml_1.tokenizeXml)("  &nope;", xml_1.DEFAULT_XML_TOKENIZER_OPTIONS, pool)), (e) => e instanceof xml_1.XmlParseError &&
        e.code === "XML_ENTITY_UNKNOWN" &&
        e.offset === 2);
});
(0, node_test_1.test)("tokenizeXml rejects DOCTYPE/DTD by policy", () => {
    const pool = new xml_1.XmlNamePool();
    strict_1.default.throws(() => Array.from((0, xml_1.tokenizeXml)("<!DOCTYPE a><a/>", xml_1.DEFAULT_XML_TOKENIZER_OPTIONS, pool)), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_DTD_REJECTED");
});
(0, node_test_1.test)("tokenizeXml can emit comments and PI when enabled", () => {
    const pool = new xml_1.XmlNamePool();
    const tokens = Array.from((0, xml_1.tokenizeXml)("<!--x--><?y?><a/>", { ...xml_1.DEFAULT_XML_TOKENIZER_OPTIONS, emitNonContentEvents: true }, pool));
    strict_1.default.equal(tokens[0].kind, "comment");
    strict_1.default.equal(tokens[1].kind, "pi");
    strict_1.default.equal(tokens[2].kind, "open");
});
(0, node_test_1.test)("tokenizeXml skips comments and PI by default", () => {
    const pool = new xml_1.XmlNamePool();
    const tokens = Array.from((0, xml_1.tokenizeXml)("<!--x--><?y?><a/>", xml_1.DEFAULT_XML_TOKENIZER_OPTIONS, pool));
    strict_1.default.equal(tokens.length, 1);
    strict_1.default.equal(tokens[0].kind, "open");
});
