"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const xml_1 = require("@/xml");
const cursor_1 = require("../../src/xml/core/cursor");
(0, node_test_1.test)("XmlNamePool interns and roundtrips", () => {
    const pool = new xml_1.XmlNamePool();
    const a1 = pool.intern("a");
    const a2 = pool.intern("a");
    const b = pool.intern("b");
    strict_1.default.equal(a1, a2);
    strict_1.default.notEqual(a1, b);
    strict_1.default.equal(pool.toString(a1), "a");
    strict_1.default.equal(pool.toString(b), "b");
});
(0, node_test_1.test)("XmlNamePool throws on out-of-range id", () => {
    const pool = new xml_1.XmlNamePool();
    strict_1.default.throws(() => pool.toString(9999));
});
(0, node_test_1.test)("Cursor helpers operate on char codes", () => {
    const c = (0, cursor_1.makeCursor)("ab");
    strict_1.default.equal((0, cursor_1.peekCharCode)(c), "a".charCodeAt(0));
    strict_1.default.equal((0, cursor_1.nextCharCode)(c), "a".charCodeAt(0));
    strict_1.default.equal((0, cursor_1.peekCharCode)(c), "b".charCodeAt(0));
    (0, cursor_1.expectCharCode)(c, "b".charCodeAt(0), "X", "expected b");
    strict_1.default.equal((0, cursor_1.peekCharCode)(c), -1);
});
(0, node_test_1.test)("expectCharCode throws XmlParseError with correct offset", () => {
    const c = (0, cursor_1.makeCursor)("ab");
    // consume 'a'
    (0, cursor_1.nextCharCode)(c);
    strict_1.default.throws(() => (0, cursor_1.expectCharCode)(c, "c".charCodeAt(0), "XML_EXPECT", "nope"), (e) => e instanceof xml_1.XmlParseError && e.code === "XML_EXPECT" && e.offset === 1);
});
