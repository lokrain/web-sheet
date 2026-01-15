# XML module (src/xml)

## Supported XML subset

This parser targets a pragmatic, safe subset of XML intended for data-oriented documents.

### Supported

- Elements, attributes, and text content
- Entity decoding for built-in and numeric entities
- Comments and processing instructions (spans only, no content)
- Fragment mode (multiple roots) when `requireSingleRoot: false`

### Intentionally not supported

- DTD/DOCTYPE and general markup declarations
- CDATA sections
- Namespace processing beyond allowing `:` in names
- Full Unicode XML Name validation (ASCII-focused)

## Safety and limits

- Hard DTD rejection
- Configurable limits (`maxDepth`, `maxTokens`)
- Guarded factories for spans/attrs/tokens

## Streaming APIs

- `parseEventsFromString(input)` yields events as an async iterable
- `parseEventsFromAsyncIterable(chunks)` consumes `AsyncIterable<string | Uint8Array>`
- `parseEventsFromNodeReadable(readable)` consumes a Node `Readable`
- `parseEventsToSink(input, sink)` delivers events to a callback without buffering arrays
- `parseEventsToSinkSync(input, sink)` does the same for string inputs

`parseEventsIterable(input)` remains the synchronous API. `parseEventsFromString` exists for API symmetry with async pipelines.

These APIs stream through a decoding stage and avoid buffering all events in memory.

### Text handling defaults

By default, tokenization trims and skips whitespace-only text (`trimText: true`, `skipWhitespaceText: true`).
If you need exact text preservation, use:

- `trimText: false`
- `skipWhitespaceText: false`

Streaming parsing coalesces adjacent `Text` events to keep chunk invariance.

## Errors

All parser/tokenizer failures throw `XmlError`, which includes:

- `code`: stable error code string
- `position.offset`: 0-based offset
- `position.line` / `position.column`
- `context` (optional) for extra details

## Fragments

Use `parseFragment()` to parse XML fragments (multiple roots) without toggling `requireSingleRoot` manually.

## Utilities

- `getEventSignature(evt, pool)` provides a stable event signature for hashing/comparison.
