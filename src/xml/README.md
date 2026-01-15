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
- `parseEventsFromReadable(readable)` is a convenience alias for async iterables
- `parseEventsToSink(input, sink)` delivers events to a callback without buffering arrays

These APIs stream through a decoding stage and avoid buffering all events in memory.

## Errors

All parser/tokenizer failures throw `XmlError`, which includes:

- `code`: stable error code string
- `position.offset`: 0-based offset
- `position.line` / `position.column` when the input is a full string
- `context` (optional) for extra details
