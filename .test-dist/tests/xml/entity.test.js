"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const xml_1 = require("@/xml");
(0, node_test_1.test)("decodeXmlEntities decodes built-ins", () => {
    strict_1.default.equal((0, xml_1.decodeXmlEntities)("&lt;&gt;&amp;&quot;&apos;", 0), "<>&\"'");
});
(0, node_test_1.test)("decodeXmlEntities decodes numeric hex/dec", () => {
    strict_1.default.equal((0, xml_1.decodeXmlEntities)("A&#x41;B", 0), "AAB");
    strict_1.default.equal((0, xml_1.decodeXmlEntities)("A&#65;B", 0), "AAB");
});
(0, node_test_1.test)("decodeXmlEntities supports resolver for named entities", () => {
    const out = (0, xml_1.decodeXmlEntities)("x&foo;y", 10, (name) => name === "foo" ? "BAR" : null);
    strict_1.default.equal(out, "xBARy");
});
(0, node_test_1.test)("decodeXmlEntities throws XmlParseError on unknown named entity", () => {
    strict_1.default.throws(() => (0, xml_1.decodeXmlEntities)("&nope;", 0), (e) => e instanceof xml_1.XmlParseError &&
        e.code === "XML_ENTITY_UNKNOWN" &&
        e.offset === 0);
});
(0, node_test_1.test)("decodeXmlEntities throws XmlParseError on unterminated entity", () => {
    strict_1.default.throws(() => (0, xml_1.decodeXmlEntities)("x&nope", 7), (e) => e instanceof xml_1.XmlParseError &&
        e.code === "XML_ENTITY_UNTERMINATED" &&
        e.offset === 8);
});
(0, node_test_1.test)("decodeXmlEntities validates codepoints (surrogates)", () => {
    strict_1.default.throws(() => (0, xml_1.decodeXmlEntities)("&#xD800;", 0), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_ENTITY_BAD");
});
(0, node_test_1.test)("decodeXmlEntities validates codepoints (range)", () => {
    strict_1.default.throws(() => (0, xml_1.decodeXmlEntities)("&#x110000;", 0), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_ENTITY_BAD");
});
