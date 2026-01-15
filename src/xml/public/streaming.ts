import { Readable } from "node:stream";
import type { XmlNamePool } from "@/xml/public/name-pool";
import { createNamePool } from "@/xml/public/name-pool";
import { createStreamParser, createTextCoalescer } from "@/xml/public/parser";
import {
  createStreamingTokenizer,
  createTokenizer,
} from "@/xml/public/tokenizer";
import type {
  XmlEvent,
  XmlParserOptions,
  XmlTokenizerOptions,
} from "@/xml/public/types";

export type ParseEventsOptions = Readonly<{
  tokenizer?: Partial<XmlTokenizerOptions>;
  parser?: Partial<XmlParserOptions>;
  pool?: XmlNamePool;
}>;

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    Boolean(value) &&
    typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === "function"
  );
}

export function* parseEventsIterable(
  input: string,
  options?: ParseEventsOptions,
): Iterable<XmlEvent> {
  const pool = options?.pool ?? createNamePool();
  const tokenizer = createTokenizer(options?.tokenizer, pool);
  const parser = createStreamParser(options?.parser, pool);

  const events: XmlEvent[] = [];
  const emit = (evt: XmlEvent) => events.push(evt);

  for (const token of tokenizer.tokenize(input)) {
    parser.write(token, emit);
    for (let i = 0; i < events.length; i++) yield events[i];
    events.length = 0;
  }

  parser.end();
}

export async function* parseEventsFromString(
  input: string,
  options?: ParseEventsOptions,
): AsyncIterable<XmlEvent> {
  for (const evt of parseEventsIterable(input, options)) {
    yield evt;
  }
}

export async function* parseEventsFromAsyncIterable(
  chunks: AsyncIterable<string | Uint8Array>,
  options?: ParseEventsOptions,
): AsyncIterable<XmlEvent> {
  const pool = options?.pool ?? createNamePool();
  const tokenizer = createStreamingTokenizer(options?.tokenizer, pool);
  const parser = createStreamParser(options?.parser, pool);
  const events: XmlEvent[] = [];
  const coalescer = createTextCoalescer((evt) => events.push(evt));
  const emitToken = (token: Parameters<typeof parser.write>[0]) =>
    parser.write(token, coalescer.emit);

  for await (const chunk of chunks) {
    tokenizer.write(chunk, emitToken);
    for (let i = 0; i < events.length; i++) yield events[i];
    events.length = 0;
  }

  tokenizer.end(emitToken);
  coalescer.flush();
  for (let i = 0; i < events.length; i++) yield events[i];
  events.length = 0;

  parser.end();
}

export function parseEventsFromNodeReadable(
  readable: Readable,
  options?: ParseEventsOptions,
): AsyncIterable<XmlEvent> {
  if (readable.readableObjectMode) {
    throw new TypeError(
      "parseEventsFromNodeReadable: objectMode streams are not supported",
    );
  }
  return parseEventsFromAsyncIterable(
    readable as AsyncIterable<Uint8Array>,
    options,
  );
}

export function parseEventsToSinkSync(
  input: string,
  sink: (evt: XmlEvent) => void,
  options?: ParseEventsOptions,
): void {
  const pool = options?.pool ?? createNamePool();
  const tokenizer = createTokenizer(options?.tokenizer, pool);
  const parser = createStreamParser(options?.parser, pool);
  for (const token of tokenizer.tokenize(input)) {
    parser.write(token, sink);
  }
  parser.end();
}

export async function parseEventsToSink(
  input: string | AsyncIterable<string | Uint8Array> | Readable,
  sink: (evt: XmlEvent) => void,
  options?: ParseEventsOptions,
): Promise<void> {
  if (typeof input === "string") {
    parseEventsToSinkSync(input, sink, options);
    return;
  }

  if (
    typeof Readable !== "undefined" &&
    input instanceof Readable &&
    input.readableObjectMode
  ) {
    throw new TypeError(
      "parseEventsToSink: objectMode streams are not supported",
    );
  }

  if (!isAsyncIterable<string | Uint8Array>(input)) {
    throw new TypeError(
      "parseEventsToSink: input must be a string or AsyncIterable<string | Uint8Array>",
    );
  }

  for await (const evt of parseEventsFromAsyncIterable(input, options)) {
    sink(evt);
  }
}
