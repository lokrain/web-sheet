"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const xml_1 = require("@/xml");
function parseAll(xml, pool, parserOpts) {
    const opts = { ...xml_1.DEFAULT_XML_STREAM_PARSER_OPTIONS, ...(parserOpts ?? {}) };
    (0, xml_1.parseXmlStream)((0, xml_1.tokenizeXml)(xml, xml_1.DEFAULT_XML_TOKENIZER_OPTIONS, pool), () => { }, opts, pool);
}
(0, node_test_1.test)("parseXmlStream rejects multiple roots in document mode", () => {
    const pool = new xml_1.XmlNamePool();
    strict_1.default.throws(() => parseAll("<a/><b/>", pool), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_MULTIPLE_ROOTS");
});
(0, node_test_1.test)("parseXmlStream rejects text before root in document mode", () => {
    const pool = new xml_1.XmlNamePool();
    strict_1.default.throws(() => parseAll("oops<a/>", pool), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_TEXT_BEFORE_ROOT");
});
(0, node_test_1.test)("parseXmlStream rejects text after root in document mode", () => {
    const pool = new xml_1.XmlNamePool();
    strict_1.default.throws(() => parseAll("<a/>tail", pool), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_TEXT_AFTER_ROOT");
});
(0, node_test_1.test)("parseXmlStream allows fragments when requireSingleRoot=false", () => {
    const pool = new xml_1.XmlNamePool();
    strict_1.default.doesNotThrow(() => parseAll("<a/><b/>", pool, { requireSingleRoot: false }));
});
(0, node_test_1.test)("parseXmlStream detects mismatched tags", () => {
    const pool = new xml_1.XmlNamePool();
    strict_1.default.throws(() => parseAll("<a></b>", pool), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_TAG_MISMATCH");
});
(0, node_test_1.test)("parseXmlStream detects unclosed tags", () => {
    const pool = new xml_1.XmlNamePool();
    strict_1.default.throws(() => parseAll("<a><b></b>", pool), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_UNCLOSED_TAGS");
});
(0, node_test_1.test)("parseXmlStream enforces maxDepth", () => {
    const pool = new xml_1.XmlNamePool();
    strict_1.default.throws(() => parseAll("<a><b/></a>", pool, { maxDepth: 1 }), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_DEPTH_LIMIT");
});
(0, node_test_1.test)("parseXmlStream enforces maxTokens", () => {
    const pool = new xml_1.XmlNamePool();
    // Token stream: open a, text, close a => 3 tokens
    strict_1.default.throws(() => parseAll("<a>t</a>", pool, { maxTokens: 2 }), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_TOKEN_LIMIT");
});
