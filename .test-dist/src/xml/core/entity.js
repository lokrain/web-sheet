"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeXmlEntities = decodeXmlEntities;
const error_1 = require("@/xml/core/error");
function decodeXmlEntities(text, baseOffset, resolver) {
    const parts = [];
    let last = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) !== 38)
            continue; // '&'
        parts.push(text.slice(last, i));
        const semi = text.indexOf(";", i + 1);
        if (semi === -1) {
            throw new error_1.XmlParseError("XML_ENTITY_UNTERMINATED", baseOffset + i, "Unterminated entity");
        }
        const body = text.slice(i + 1, semi);
        parts.push(decodeEntityBody(body, baseOffset + i, resolver));
        i = semi;
        last = semi + 1;
    }
    parts.push(text.slice(last));
    return parts.join("");
}
function decodeEntityBody(body, at, resolver) {
    switch (body) {
        case "lt":
            return "<";
        case "gt":
            return ">";
        case "amp":
            return "&";
        case "quot":
            return '"';
        case "apos":
            return "'";
        default: {
            if (body.startsWith("#x")) {
                const cp = Number.parseInt(body.slice(2), 16);
                if (!isValidCodePoint(cp)) {
                    throw new error_1.XmlParseError("XML_ENTITY_BAD", at, `Bad hex entity: &${body};`);
                }
                return String.fromCodePoint(cp);
            }
            if (body.startsWith("#")) {
                const cp = Number.parseInt(body.slice(1), 10);
                if (!isValidCodePoint(cp)) {
                    throw new error_1.XmlParseError("XML_ENTITY_BAD", at, `Bad dec entity: &${body};`);
                }
                return String.fromCodePoint(cp);
            }
            if (resolver) {
                const resolved = resolver(body);
                if (resolved !== null)
                    return resolved;
            }
            // No DTD => reject unknown named entities deterministically
            throw new error_1.XmlParseError("XML_ENTITY_UNKNOWN", at, `Unknown entity: &${body};`);
        }
    }
}
function isValidCodePoint(cp) {
    return (Number.isInteger(cp) &&
        cp >= 0 &&
        cp <= 0x10ffff &&
        !(cp >= 0xd800 && cp <= 0xdfff));
}
