"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectTokens = collectTokens;
exports.collectEvents = collectEvents;
exports.mustThrow = mustThrow;
const strict_1 = __importDefault(require("node:assert/strict"));
const name_pool_1 = require("../../src/xml/core/name-pool");
const options_1 = require("../../src/xml/core/options");
const stream_parser_1 = require("../../src/xml/core/stream-parser");
const tokenizer_1 = require("../../src/xml/core/tokenizer");
function collectTokens(input, opts) {
    const pool = new name_pool_1.XmlNamePool();
    const options = {
        ...options_1.DEFAULT_XML_TOKENIZER_OPTIONS,
        ...(opts ?? {}),
    };
    const tokens = Array.from((0, tokenizer_1.tokenizeXml)(input, options, pool));
    return { pool, tokens };
}
function collectEvents(input, tokenizerOpts, parserOpts) {
    const pool = new name_pool_1.XmlNamePool();
    const tOpts = {
        ...options_1.DEFAULT_XML_TOKENIZER_OPTIONS,
        ...(tokenizerOpts ?? {}),
    };
    const pOpts = {
        ...stream_parser_1.DEFAULT_XML_STREAM_PARSER_OPTIONS,
        ...(parserOpts ?? {}),
    };
    const events = [];
    (0, stream_parser_1.parseXmlStream)((0, tokenizer_1.tokenizeXml)(input, tOpts, pool), (e) => events.push(e), pOpts, pool);
    return { pool, events };
}
function mustThrow(fn, predicate) {
    let thrown = null;
    try {
        fn();
    }
    catch (e) {
        thrown = e;
    }
    strict_1.default.notEqual(thrown, null, "Expected function to throw");
    predicate(thrown);
}
