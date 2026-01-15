import assert from "node:assert/strict";

import {
  DEFAULT_XML_TOKENIZER_OPTIONS,
  createStreamingTokenizer,
  createNamePool,
  createTokenizer,
  tokenize,
  XmlError,
} from "@/xml";

test("tokenization emits element and text tokens with spans", () => {
  const pool = createNamePool();
  const input = '<a x="1">hi</a>';
  const tokens = Array.from(
    tokenize(input, DEFAULT_XML_TOKENIZER_OPTIONS, pool),
  );

  assert.equal(tokens[0].kind, "open");
  assert.equal(
    pool.toString(tokens[0].kind === "open" ? tokens[0].name : (0 as never)),
    "a",
  );
  assert.equal(tokens[1].kind, "text");
  assert.equal(tokens[1].kind === "text" ? tokens[1].value : "", "hi");
  assert.equal(tokens[2].kind, "close");

  // Basic span sanity
  assert.equal(tokens[0].span.start, 0);
  assert.equal(tokens[2].span.end, input.length);
});

test("tokenization emits self-closing elements", () => {
  const pool = createNamePool();
  const tokens = Array.from(
    tokenize("<a/>", DEFAULT_XML_TOKENIZER_OPTIONS, pool),
  );
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].kind, "open");
  assert.equal(tokens[0].kind === "open" ? tokens[0].selfClosing : false, true);
});

test("entity references in text are decoded", () => {
  const pool = createNamePool();
  const tokens = Array.from(
    tokenize("<a>&lt;</a>", DEFAULT_XML_TOKENIZER_OPTIONS, pool),
  );
  assert.equal(tokens[1].kind, "text");
  assert.equal(tokens[1].kind === "text" ? tokens[1].value : "", "<");
});

test("numeric entity references are decoded", () => {
  const pool = createNamePool();
  const tokens = Array.from(
    tokenize("<a>A&#x41;B</a>", DEFAULT_XML_TOKENIZER_OPTIONS, pool),
  );
  assert.equal(tokens[1].kind, "text");
  assert.equal(tokens[1].kind === "text" ? tokens[1].value : "", "AAB");
});

test("entity errors report correct offsets after trimming", () => {
  const pool = createNamePool();
  // Leading whitespace is trimmed, but the entity starts at offset 2.
  assert.throws(
    () =>
      Array.from(tokenize("  &nope;", DEFAULT_XML_TOKENIZER_OPTIONS, pool)),
    (e: unknown) =>
      e instanceof XmlError &&
      e.code === "XML_ENTITY_UNKNOWN" &&
      e.offset === 2,
  );
});

test("tokenize errors include line/column", () => {
  const pool = createNamePool();
  assert.throws(
    () => Array.from(tokenize("<a>\n<1>", DEFAULT_XML_TOKENIZER_OPTIONS, pool)),
    (e: unknown) =>
      e instanceof XmlError &&
      e.position.line === 2 &&
      e.position.column === 2,
  );
});

test("tokenize rejects invalid numeric entities", () => {
  const pool = createNamePool();
  assert.throws(
    () => Array.from(tokenize("<a>&#xD800;</a>", DEFAULT_XML_TOKENIZER_OPTIONS, pool)),
    (e: unknown) => e instanceof XmlError && e.code === "XML_ENTITY_BAD",
  );
});

test("DOCTYPE/DTD is rejected by policy", () => {
  const pool = createNamePool();
  assert.throws(
    () =>
      Array.from(
        tokenize("<!DOCTYPE a><a/>", DEFAULT_XML_TOKENIZER_OPTIONS, pool),
      ),
    (e: unknown) => e instanceof XmlError && e.code === "XML_DTD_REJECTED",
  );
});

test("comment/PI tokens are emitted when configured", () => {
  const pool = createNamePool();
  const tokens = Array.from(
    tokenize(
      "<!--x--><?y?><a/>",
      { ...DEFAULT_XML_TOKENIZER_OPTIONS, emitNonContentEvents: true },
      pool,
    ),
  );

  assert.equal(tokens[0].kind, "comment");
  assert.equal(tokens[1].kind, "pi");
  assert.equal(tokens[2].kind, "open");
});

test("comment/PI tokens are omitted by default", () => {
  const pool = createNamePool();
  const tokens = Array.from(
    tokenize("<!--x--><?y?><a/>", DEFAULT_XML_TOKENIZER_OPTIONS, pool),
  );
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].kind, "open");
});

test("whitespace-only text is omitted by default", () => {
  const pool = createNamePool();
  const tokens = Array.from(
    tokenize(" \n<a/> \n", DEFAULT_XML_TOKENIZER_OPTIONS, pool),
  );
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].kind, "open");
});

test("tokenizer instances are reusable", () => {
  const pool = createNamePool();
  const tokenizer = createTokenizer(DEFAULT_XML_TOKENIZER_OPTIONS, pool);
  const tokens = Array.from(tokenizer.tokenize("<a/>"));
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].kind, "open");
});

test("streaming tokenizer emits tokens across chunks", () => {
  const pool = createNamePool();
  const tokenizer = createStreamingTokenizer(DEFAULT_XML_TOKENIZER_OPTIONS, pool);
  const out: string[] = [];

  for (const tok of tokenizer.write("<root>")) out.push(tok.kind);
  for (const tok of tokenizer.write("<a/>")) out.push(tok.kind);
  for (const tok of tokenizer.write("</root>")) out.push(tok.kind);
  for (const tok of tokenizer.end()) out.push(tok.kind);

  assert.deepEqual(out, ["open", "open", "close"]);
});

test("streaming tokenizer accepts Uint8Array chunks", () => {
  const pool = createNamePool();
  const tokenizer = createStreamingTokenizer(DEFAULT_XML_TOKENIZER_OPTIONS, pool);
  const encoder = new TextEncoder();

  const a = Array.from(tokenizer.write(encoder.encode("<a>")));
  const b = Array.from(tokenizer.write(encoder.encode("hi</a>")));
  const c = Array.from(tokenizer.end());

  const tokens = [...a, ...b, ...c];
  assert.equal(tokens.length, 3);
  assert.equal(tokens[0].kind, "open");
  assert.equal(tokens[1].kind, "text");
  assert.equal(tokens[2].kind, "close");
});
