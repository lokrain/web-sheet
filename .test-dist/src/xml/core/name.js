"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isXmlNameStart = isXmlNameStart;
exports.isXmlNameChar = isXmlNameChar;
function isXmlNameStart(c) {
    return ((c >= 65 && c <= 90) || // A-Z
        (c >= 97 && c <= 122) || // a-z
        c === 95 || // _
        c === 58 // :
    );
}
function isXmlNameChar(c) {
    return (isXmlNameStart(c) ||
        (c >= 48 && c <= 57) || // 0-9
        c === 45 || // -
        c === 46 // .
    );
}
