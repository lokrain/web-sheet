import assert from "node:assert/strict";

import { createNamePool, DEFAULT_XML_TOKENIZER_OPTIONS, tokenize } from "@/xml";

test("entity decoding is observable through tokenization", () => {
	const pool = createNamePool();
	const tokens = Array.from(
		tokenize("<a>&amp;</a>", DEFAULT_XML_TOKENIZER_OPTIONS, pool),
	);
	assert.equal(tokens[1].kind, "text");
	assert.equal(tokens[1].kind === "text" ? tokens[1].value : "", "&");
});
