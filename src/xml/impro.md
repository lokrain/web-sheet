# XML module review (src/xml)

## Grade

**Overall: A- (strong foundations, key correctness gaps fixed)**

- **Design/API shape: A-** — clean entrypoint, well-separated tokenizer vs. stream parser, dependency injection for name interning and entity resolution.
- **Correctness vs XML 1.0 spec: B** — intentionally “not full XML”, but the most surprising behaviors were addressed.
- **Performance/safety: A-** — streaming-ish tokenizer, sensible default limits, deterministic DTD rejection.
- **Ergonomics/debuggability: B** — offsets exist and safety factories are in place, but line/column helpers are still missing.

## What’s good

- **Clear layering:**
  - `core/tokenizer.ts` handles lexical/token production.
  - `core/stream-parser.ts` enforces nesting + emits semantic events.
  - `core/name-pool.ts` provides stable `NameId` interning.
  - `core/entity.ts` makes entity decoding policy-driven and deterministic.
- **Policy-driven safety:** hard DTD/DOCTYPE rejection avoids a big class of security + complexity problems.
- **Options are pragmatic:** whitespace trimming/skipping and non-content event control match typical “XML as data” uses.

## Spec coverage / intentional limitations (should be documented)

These appear deliberate, but should be explicit in docs to prevent “it’s an XML parser” assumptions:

- **No CDATA (`<![CDATA[...]]>`), no DTD, no general markup declarations** (currently errors).
- **XML Name rules are ASCII-ish** (`A-Za-z_:` start; plus digits/`-`/`.`). Real XML names allow many Unicode codepoints.
- **Comments and PI** are recognized but don’t preserve content (token has only `span`).
- **No namespace processing** beyond allowing `:` in names.

Documented:

- “Supported XML subset” added in `src/xml/README.md`.

## Testing status

- Jest specs are colocated under `src/xml/**` and cover tokenizer, entity decode, stream parser invariants, name pooling, token factories, and both adapters.

## Improvements to implement (from latest feedback)

### Potential follow-ups (new)

- **Rename collect-style API for clarity:** `parseEvents()` returns an array but reads like a streaming API. Consider renaming to `parseEventsCollect()` (or similar) and keep `parseEventsIterable()` as the primary entrypoint.
- **Clarify internal surface:** `xml/internal/index.ts` re-exports parser/tokenizer internals. Consider tightening or documenting this surface to avoid accidental consumer usage.
- **Reconsider public token/span constructors:** `public/types.ts` re-exports `createSpan` and token constructors. If the intent is “factories-only at root”, consider keeping these helpers internal or documenting their stability explicitly.
- **Public position helpers surface:** `public/position.ts` still exposes `offsetToLineColumn`/`spanToLineColumn`. If these are not intended for consumers, consider moving them under `internal/` or documenting their scope.
- **Reduce parseEvents array usage in adapters tests/docs:** `adapters.spec.ts` (and likely docs) use `parseEvents()` for batch arrays. Consider using `parseEventsIterable()` for better demonstration of streaming-first usage.
- **Optional stricter XML name rules:** `isXmlNameStart/Char` are ASCII-only by design. Consider a future toggle for full XML Name compliance or explicit validation mode (for schema-sensitive consumers).
- **Consider a non-allocating sync iterator adapter:** `parseEventsIterable` currently buffers via an array. A small generator adapter around `StreamParserImpl.write` could yield immediately to reduce allocations for large strings.
- **Document streaming text deferral semantics:** the streaming tokenizer may defer trailing text until the next chunk or `end()` to preserve chunk invariance; consider documenting this so consumers don’t expect immediate text callbacks on partial chunks.
- **Define stability tiers for the public surface:** explicitly label which APIs are “stable” vs “internal/experimental” to reduce future breaking changes.
- **Consolidate error codes into an enum-like export:** provide a shared list of error codes to avoid stringly-typed consumers and typos.
