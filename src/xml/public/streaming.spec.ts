import assert from "node:assert/strict";

import {
  parseEventsFromAsyncIterable,
  parseEventsFromString,
  parseEventsToSink,
} from "@/xml";

async function* chunked(...chunks: (string | Uint8Array)[]) {
  for (const chunk of chunks) {
    await Promise.resolve();
    yield chunk;
  }
}

test("parseEventsFromString yields events without buffering arrays", async () => {
  const events = [] as string[];
  for await (const evt of parseEventsFromString("<a>hi</a>")) {
    events.push(evt.kind);
  }
  assert.deepEqual(events, ["StartElement", "Text", "EndElement"]);
});

test("parseEventsFromAsyncIterable handles chunk boundaries", async () => {
  const encoder = new TextEncoder();
  const chunks = chunked(encoder.encode("<a>"), encoder.encode("hi</a>"));

  const events = [] as string[];
  for await (const evt of parseEventsFromAsyncIterable(chunks)) {
    events.push(evt.kind);
  }

  assert.deepEqual(events, ["StartElement", "Text", "EndElement"]);
});

test("parseEventsToSink accepts async iterable input", async () => {
  const encoder = new TextEncoder();
  const chunks = chunked(encoder.encode("<a/>"));
  const events = [] as string[];

  await parseEventsToSink(chunks, (evt) => events.push(evt.kind));

  assert.deepEqual(events, ["StartElement", "EndElement"]);
});
