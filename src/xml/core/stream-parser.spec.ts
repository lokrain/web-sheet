import assert from "node:assert/strict";

import {
  createNamePool,
  createStreamParser,
  DEFAULT_XML_STREAM_PARSER_OPTIONS,
  DEFAULT_XML_TOKENIZER_OPTIONS,
  tokenize,
  XmlError,
} from "@/xml";

function parseAll(
  xml: string,
  pool: ReturnType<typeof createNamePool>,
  parserOpts?: Partial<typeof DEFAULT_XML_STREAM_PARSER_OPTIONS>,
): void {
  const opts = { ...DEFAULT_XML_STREAM_PARSER_OPTIONS, ...(parserOpts ?? {}) };
  const parser = createStreamParser(opts, pool);
  parser.writeAll(
    tokenize(xml, DEFAULT_XML_TOKENIZER_OPTIONS, pool),
    () => undefined,
  );
  parser.end();
}

test("multiple roots are rejected when single-root is required", () => {
  const pool = createNamePool();
  assert.throws(
    () => parseAll("<a/><b/>", pool),
    (e: unknown) => e instanceof XmlError && e.code === "XML_MULTIPLE_ROOTS",
  );
});

test("text before root is rejected when single-root is required", () => {
  const pool = createNamePool();
  assert.throws(
    () => parseAll("oops<a/>", pool),
    (e: unknown) => e instanceof XmlError && e.code === "XML_TEXT_BEFORE_ROOT",
  );
});

test("text after root is rejected when single-root is required", () => {
  const pool = createNamePool();
  assert.throws(
    () => parseAll("<a/>tail", pool),
    (e: unknown) => e instanceof XmlError && e.code === "XML_TEXT_AFTER_ROOT",
  );
});

test("fragment documents are allowed when single-root is disabled", () => {
  const pool = createNamePool();
  assert.doesNotThrow(() =>
    parseAll("<a/><b/>", pool, { requireSingleRoot: false }),
  );
});

test("mismatched tags are rejected", () => {
  const pool = createNamePool();
  assert.throws(
    () => parseAll("<a></b>", pool),
    (e: unknown) => e instanceof XmlError && e.code === "XML_TAG_MISMATCH",
  );
});

test("unclosed tags are rejected", () => {
  const pool = createNamePool();
  assert.throws(
    () => parseAll("<a><b></b>", pool),
    (e: unknown) => e instanceof XmlError && e.code === "XML_UNCLOSED_TAGS",
  );
});

test("maximum depth is enforced", () => {
  const pool = createNamePool();
  assert.throws(
    () => parseAll("<a><b/></a>", pool, { maxDepth: 1 }),
    (e: unknown) => e instanceof XmlError && e.code === "XML_DEPTH_LIMIT",
  );
});

test("token limit is enforced", () => {
  const pool = createNamePool();
  // Token stream: open a, text, close a => 3 tokens
  assert.throws(
    () => parseAll("<a>t</a>", pool, { maxTokens: 2 }),
    (e: unknown) => e instanceof XmlError && e.code === "XML_TOKEN_LIMIT",
  );
});
