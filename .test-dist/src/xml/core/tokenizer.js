"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenizer = createTokenizer;
exports.tokenizeXml = tokenizeXml;
const cursor_1 = require("@/xml/core/cursor");
const entity_1 = require("@/xml/core/entity");
const error_1 = require("@/xml/core/error");
const name_1 = require("@/xml/core/name");
const name_pool_1 = require("@/xml/core/name-pool");
const options_1 = require("@/xml/core/options");
function isWs(c) {
    return c === 32 || c === 9 || c === 10 || c === 13;
}
function skipWs(c) {
    while (!(0, cursor_1.eof)(c)) {
        const cc = (0, cursor_1.peekCharCode)(c);
        if (cc !== -1 && isWs(cc))
            c.i++;
        else
            break;
    }
}
function readNameString(c) {
    const c0 = (0, cursor_1.peekCharCode)(c);
    if (c0 === -1 || !(0, name_1.isXmlNameStart)(c0)) {
        throw new error_1.XmlParseError("XML_NAME_START", c.i, "Invalid XML name start");
    }
    const start = c.i;
    c.i++;
    while (!(0, cursor_1.eof)(c)) {
        const cc = (0, cursor_1.peekCharCode)(c);
        if (cc !== -1 && (0, name_1.isXmlNameChar)(cc))
            c.i++;
        else
            break;
    }
    return c.input.slice(start, c.i);
}
function readAttrValue(c, env) {
    const q = (0, cursor_1.nextCharCode)(c);
    if (q !== 34 && q !== 39)
        throw new error_1.XmlParseError("XML_ATTR_QUOTE", Math.max(0, c.i - 1), "Expected attribute quote");
    const quote = q;
    const start = c.i;
    while (!(0, cursor_1.eof)(c)) {
        const cc = (0, cursor_1.nextCharCode)(c);
        if (cc === quote) {
            const raw = (0, cursor_1.slice)(c, start, c.i - 1);
            return env.decode(raw, start);
        }
    }
    throw new error_1.XmlParseError("XML_ATTR_UNTERMINATED", start, "Unterminated attribute value");
}
function normalizeText(raw, env, baseOffset) {
    let t = raw;
    let leadingTrim = 0;
    if (env.opts.trimText) {
        let start = 0;
        let end = t.length;
        while (start < end && isWs(t.charCodeAt(start)))
            start++;
        while (end > start && isWs(t.charCodeAt(end - 1)))
            end--;
        leadingTrim = start;
        t = t.slice(start, end);
    }
    if (env.opts.skipWhitespaceText) {
        let allWs = true;
        for (let k = 0; k < t.length; k++) {
            if (!isWs(t.charCodeAt(k))) {
                allWs = false;
                break;
            }
        }
        if (allWs)
            return null;
    }
    if (t.length === 0)
        return null;
    return env.decode(t, baseOffset + leadingTrim);
}
function makeSpan(start, end) {
    return { start, end };
}
function scanComment(c, start, emit) {
    const endIdx = (0, cursor_1.indexOfFrom)(c, "-->", c.i);
    if (endIdx === -1)
        throw new error_1.XmlParseError("XML_COMMENT_UNTERMINATED", start, "Unterminated comment");
    c.i = endIdx + 3;
    emit({ kind: "comment", span: makeSpan(start, c.i) });
}
function scanPI(c, start, emit) {
    const endIdx = (0, cursor_1.indexOfFrom)(c, "?>", c.i);
    if (endIdx === -1)
        throw new error_1.XmlParseError("XML_PI_UNTERMINATED", start, "Unterminated processing instruction");
    c.i = endIdx + 2;
    emit({ kind: "pi", span: makeSpan(start, c.i) });
}
function scanCloseTag(c, start, env, emit) {
    // positioned after "</"
    skipWs(c);
    const nameStr = readNameString(c);
    skipWs(c);
    (0, cursor_1.expectCharCode)(c, 62, "XML_CLOSETAG_GT", "Expected '>'");
    const name = env.intern(nameStr);
    emit({ kind: "close", name, span: makeSpan(start, c.i) });
}
function scanOpenTag(c, start, env, emit) {
    // positioned after "<"
    skipWs(c);
    const nameStr = readNameString(c);
    const name = env.intern(nameStr);
    const attrs = [];
    let selfClosing = false;
    while (!(0, cursor_1.eof)(c)) {
        skipWs(c);
        const cc = (0, cursor_1.peekCharCode)(c);
        if (cc === 47) {
            // "/>"
            c.i++;
            (0, cursor_1.expectCharCode)(c, 62, "XML_TAG_END", "Expected '>' after '/'");
            selfClosing = true;
            emit({
                kind: "open",
                name,
                attrs,
                selfClosing,
                span: makeSpan(start, c.i),
            });
            return;
        }
        if (cc === 62) {
            // ">"
            c.i++;
            emit({
                kind: "open",
                name,
                attrs,
                selfClosing,
                span: makeSpan(start, c.i),
            });
            return;
        }
        // attribute
        const attrNameStr = readNameString(c);
        const attrName = env.intern(attrNameStr);
        skipWs(c);
        (0, cursor_1.expectCharCode)(c, 61, "XML_ATTR_EQ", "Expected '=' after attribute name");
        skipWs(c);
        const value = readAttrValue(c, env);
        attrs.push({ name: attrName, value });
    }
    throw new error_1.XmlParseError("XML_TAG_UNTERMINATED", start, "Unterminated start tag");
}
function scanMarkup(c, start, env, emit) {
    // we are positioned after '<'
    const cc = (0, cursor_1.peekCharCode)(c);
    if (cc === -1)
        throw new error_1.XmlParseError("XML_EOF", start, "Unexpected EOF after '<'");
    // comment or doctype
    if (cc === 33) {
        // "<!"
        c.i++;
        if (c.input.startsWith("--", c.i)) {
            c.i += 2; // after "<!--"
            if (!env.opts.emitNonContentEvents) {
                const endIdx = (0, cursor_1.indexOfFrom)(c, "-->", c.i);
                if (endIdx === -1)
                    throw new error_1.XmlParseError("XML_COMMENT_UNTERMINATED", start, "Unterminated comment");
                c.i = endIdx + 3;
                return;
            }
            scanComment(c, start, emit);
            return;
        }
        // hard reject DTD/DOCTYPE (policy)
        if (c.input.startsWith("DOCTYPE", c.i) ||
            c.input.startsWith("doctype", c.i)) {
            throw new error_1.XmlParseError("XML_DTD_REJECTED", start, "DOCTYPE/DTD is rejected by policy");
        }
        // any other "<!...>" is not supported in this core
        throw new error_1.XmlParseError("XML_BANG_UNSUPPORTED", start, "Unsupported markup declaration");
    }
    // processing instruction
    if (cc === 63) {
        // "<?"
        c.i++;
        if (!env.opts.emitNonContentEvents) {
            const endIdx = (0, cursor_1.indexOfFrom)(c, "?>", c.i);
            if (endIdx === -1)
                throw new error_1.XmlParseError("XML_PI_UNTERMINATED", start, "Unterminated processing instruction");
            c.i = endIdx + 2;
            return;
        }
        scanPI(c, start, emit);
        return;
    }
    // close tag
    if (cc === 47) {
        c.i++; // after "</"
        scanCloseTag(c, start, env, emit);
        return;
    }
    // open tag
    scanOpenTag(c, start, env, emit);
}
function scanTextSegment(c, until, env, emit) {
    const raw = (0, cursor_1.slice)(c, c.i, until);
    const normalized = normalizeText(raw, env, c.i);
    if (normalized !== null) {
        emit({ kind: "text", value: normalized, span: makeSpan(c.i, until) });
    }
    c.i = until;
}
function makeDecoder(opts) {
    if (!opts.decodeEntities)
        return (s) => s;
    return (s, base) => s.includes("&") ? (0, entity_1.decodeXmlEntities)(s, base, opts.entityResolver) : s;
}
/**
 * Assembled tokenizer (functional construction):
 * - policies and dependencies injected
 * - scanning broken into testable units
 * - NameId interning supported by default
 */
function createTokenizer(opts, pool) {
    const env = {
        opts,
        intern: (s) => pool.intern(s),
        decode: makeDecoder(opts),
    };
    return function* run(input) {
        const c = (0, cursor_1.makeCursor)(input);
        const emitQueue = [];
        const emit = (t) => {
            emitQueue.push(t);
        };
        while (!(0, cursor_1.eof)(c)) {
            const lt = (0, cursor_1.indexOfFrom)(c, "<", c.i);
            if (lt === -1) {
                const tail = normalizeText((0, cursor_1.slice)(c, c.i, c.len), env, c.i);
                if (tail !== null)
                    yield { kind: "text", value: tail, span: makeSpan(c.i, c.len) };
                return;
            }
            if (lt > c.i) {
                scanTextSegment(c, lt, env, emit);
                while (emitQueue.length)
                    yield emitQueue.shift();
            }
            // consume '<'
            const start = c.i;
            c.i++;
            scanMarkup(c, start, env, emit);
            while (emitQueue.length)
                yield emitQueue.shift();
        }
    };
}
function* tokenizeXml(input, options = options_1.DEFAULT_XML_TOKENIZER_OPTIONS, pool) {
    const namePool = pool ?? new name_pool_1.XmlNamePool();
    const tokenizer = createTokenizer(options, namePool);
    yield* tokenizer(input);
}
