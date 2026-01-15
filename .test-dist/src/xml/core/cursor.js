"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCursor = makeCursor;
exports.eof = eof;
exports.peekCharCode = peekCharCode;
exports.nextCharCode = nextCharCode;
exports.expectCharCode = expectCharCode;
exports.indexOfFrom = indexOfFrom;
exports.slice = slice;
const error_1 = require("@/xml/core/error");
function makeCursor(input) {
    return { input, len: input.length, i: 0 };
}
function eof(c) {
    return c.i >= c.len;
}
function peekCharCode(c) {
    return c.i < c.len ? c.input.charCodeAt(c.i) : -1;
}
function nextCharCode(c) {
    return c.i < c.len ? c.input.charCodeAt(c.i++) : -1;
}
function expectCharCode(c, code, errCode, msg) {
    const got = nextCharCode(c);
    if (got !== code)
        throw new error_1.XmlParseError(errCode, Math.max(0, c.i - 1), msg);
}
function indexOfFrom(c, needle, from) {
    return c.input.indexOf(needle, from);
}
function slice(c, start, end) {
    return c.input.slice(start, end);
}
