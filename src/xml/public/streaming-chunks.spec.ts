import assert from "node:assert/strict";

import {
  createNamePool,
  parseEventsFromAsyncIterable,
  parseEventsFromString,
  type XmlEvent,
  type XmlNamePool,
} from "@/xml";

const SAMPLE_XML =
  '<root a="1"><item id="x">hello &amp; world</item><b/></root>';

function signatureForEvent(evt: XmlEvent, pool: XmlNamePool): string {
  switch (evt.kind) {
    case "StartElement": {
      const name = pool.toString(evt.name);
      const attrs = evt.attrs
        .map((attr) => `${pool.toString(attr.name)}=${attr.value}`)
        .join(",");
      return `Start:${name}:${attrs}:${evt.selfClosing}`;
    }
    case "EndElement":
      return `End:${pool.toString(evt.name)}`;
    case "Text":
      return `Text:${evt.value}`;
    case "Comment":
      return "Comment";
    case "ProcessingInstruction":
      return "ProcessingInstruction";
    default: {
      const _never: never = evt;
      return String(_never);
    }
  }
}

async function collectSignatures(
  source: AsyncIterable<XmlEvent>,
  pool: XmlNamePool,
): Promise<string[]> {
  const out: string[] = [];
  for await (const evt of source) {
    out.push(signatureForEvent(evt, pool));
  }
  return out;
}

async function* fromChunks(chunks: (string | Uint8Array)[]) {
  for (const chunk of chunks) {
    await Promise.resolve();
    yield chunk;
  }
}

function chunkStringRandom(input: string, seed = 1337): string[] {
  const out: string[] = [];
  let i = 0;
  let s = seed >>> 0;
  while (i < input.length) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const size = (s % 7) + 1;
    out.push(input.slice(i, i + size));
    i += size;
  }
  return out;
}

function chunkBytesOneByOne(input: string): Uint8Array[] {
  const bytes = new TextEncoder().encode(input);
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i++) out.push(bytes.slice(i, i + 1));
  return out;
}

test("streaming parser is chunk-invariant", async () => {
  const options = { tokenizer: { trimText: false, skipWhitespaceText: false } };
  const poolString = createNamePool();
  const sigString = await collectSignatures(
    parseEventsFromString(SAMPLE_XML, { pool: poolString, ...options }),
    poolString,
  );

  const poolSingle = createNamePool();
  const sigSingle = await collectSignatures(
    parseEventsFromAsyncIterable(fromChunks([SAMPLE_XML]), {
      pool: poolSingle,
      ...options,
    }),
    poolSingle,
  );

  const poolRandom = createNamePool();
  const sigRandom = await collectSignatures(
    parseEventsFromAsyncIterable(fromChunks(chunkStringRandom(SAMPLE_XML)), {
      pool: poolRandom,
      ...options,
    }),
    poolRandom,
  );

  const poolBytes = createNamePool();
  const sigBytes = await collectSignatures(
    parseEventsFromAsyncIterable(fromChunks(chunkBytesOneByOne(SAMPLE_XML)), {
      pool: poolBytes,
      ...options,
    }),
    poolBytes,
  );

  assert.deepEqual(sigSingle, sigString);
  assert.deepEqual(sigRandom, sigString);
  assert.deepEqual(sigBytes, sigString);
});
