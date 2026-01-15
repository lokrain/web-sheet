"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlParseError = void 0;
class XmlParseError extends Error {
    code;
    offset;
    constructor(code, offset, message) {
        super(message);
        this.name = "XmlParseError";
        this.code = code;
        this.offset = offset;
    }
}
exports.XmlParseError = XmlParseError;
