import { XmlError } from "@/xml/core/error";
import { offsetToLineColumn } from "@/xml/core/position";
import type { XmlNamePool } from "@/xml/public/name-pool";
import type { XmlEvent } from "@/xml/public/types";
import type { XmlParserOptions, XmlTokenizerOptions } from "@/xml/public/types";
import { createNamePool } from "@/xml/public/name-pool";
import { createStreamParser } from "@/xml/public/parser";
import { createStreamingTokenizer, createTokenizer } from "@/xml/public/tokenizer";

export type ParseEventsOptions = Readonly<{
  tokenizer?: Partial<XmlTokenizerOptions>;
  parser?: Partial<XmlParserOptions>;
  pool?: XmlNamePool;
}>;

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return Boolean(value) && typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === "function";
}

async function* decodeUtf8Chunks(
  chunks: AsyncIterable<string | Uint8Array>,
): AsyncIterable<string> {
  const decoder = new TextDecoder();
  for await (const chunk of chunks) {
    if (typeof chunk === "string") {
      if (chunk.length > 0) yield chunk;
      continue;
    }
    if (chunk.length > 0) {
      const decoded = decoder.decode(chunk, { stream: true });
      if (decoded.length > 0) yield decoded;
    }
  }
  const tail = decoder.decode();
  if (tail.length > 0) yield tail;
}

export function* parseEventsIterable(
  input: string,
  options?: ParseEventsOptions,
): Iterable<XmlEvent> {
  const pool = options?.pool ?? createNamePool();
  const tokenizer = createTokenizer(options?.tokenizer, pool);
  const parser = createStreamParser(options?.parser, pool);

  try {
    for (const token of tokenizer.tokenize(input)) {
      const events = parser.write(token);
      for (let i = 0; i < events.length; i++) yield events[i];
    }

    const tail = parser.end();
    for (let i = 0; i < tail.length; i++) yield tail[i];
  } catch (e) {
    if (e instanceof XmlError) {
      const { offset } = e.position;
      const lc = offsetToLineColumn(input, offset);
      throw new XmlError(e.code, { offset, line: lc.line, column: lc.column }, e.message, e.context);
    }
    throw e;
  }
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

  for await (const chunk of decodeUtf8Chunks(chunks)) {
    const tokens = tokenizer.write(chunk);
    for (const token of tokens) {
      const events = parser.write(token);
      for (let i = 0; i < events.length; i++) yield events[i];
    }
  }

  for (const token of tokenizer.end()) {
    const events = parser.write(token);
    for (let i = 0; i < events.length; i++) yield events[i];
  }

  const tail = parser.end();
  for (let i = 0; i < tail.length; i++) yield tail[i];
}

export function parseEventsFromReadable(
  readable: AsyncIterable<string | Uint8Array>,
  options?: ParseEventsOptions,
): AsyncIterable<XmlEvent> {
  return parseEventsFromAsyncIterable(readable, options);
}

export async function parseEventsToSink(
  input: string | AsyncIterable<string | Uint8Array>,
  sink: (evt: XmlEvent) => void,
  options?: ParseEventsOptions,
): Promise<void> {
  if (typeof input === "string") {
    for (const evt of parseEventsIterable(input, options)) sink(evt);
    return;
  }

  if (!isAsyncIterable<string | Uint8Array>(input)) {
    return;
  }

  for await (const evt of parseEventsFromAsyncIterable(input, options)) {
    sink(evt);
  }
}
