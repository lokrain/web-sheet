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

## Suggested follow-up work (small, testable steps)

None currently outstanding.
