# Suggestions

Review scope: line-by-line scan of the current repo.

## High-impact / correctness
- Avoid parsing the same MusicXML twice in `src/musicxml/xml/stream-mapper.ts`. `mapMusicXmlScorePartwise` calls `detectMusicXmlRoot` (which parses) and then parses again for mapping; consider reusing the initial pool/events or detecting the root while mapping.
- Convert XML parse failures into `MusicXmlDiagnostic` entries when `strict` is false (or return a typed error result) so callers can handle invalid XML without try/catch. This affects `src/musicxml/xml/stream-mapper.ts` and `src/musicxml/xml/streaming.ts`.
- `cursorByPartVoice` is written but never read in `src/musicxml/xml/note.ts`. Either remove it or use it for voice-level validation (e.g., ensuring `backup`/`forward` align with per-voice cursors).
- `src/musicxml/xml/directions.ts` stores dynamics in a `Set`, which loses ordering and duplicates. If order or repeats matter for notation-faithful output, capture as an array instead.

## Performance / scale
- Centralize `segmentName` + `getAttr` helpers and pre-intern commonly used element/attribute names to avoid repeated `pool.toString` string conversions on every event. This pattern is repeated across `src/musicxml/xml/*.ts`.
- `mapMusicXmlScorePartwiseEventStream` uses an unbounded in-memory queue in `src/musicxml/xml/streaming.ts`. If consumers can be slow, consider a bounded queue or backpressure-aware stream to avoid growth.

## API / DX clarity
- `MusicXmlScorePartwise` is `unknown` and `score` is returned as `undefined` in `src/musicxml/xml/stream-mapper.ts`. Either implement a concrete score model or remove `score` from the result shape to avoid implying a populated model.
- Many files are empty placeholders (examples: `src/musicxml/schema/*`, `src/musicxml/model/*`, `src/musicxml/events/*`, `src/musicxml/passes/*`, `src/audio/*`, `src/hooks/*` except `use-mobile`, `src/jobs/*`, `src/shared/*`, `src/workers/*`, `src/musicxml/index.ts`). Remove these or implement them to avoid confusion.

- `README.md` is still the create-next-app template. Update it to describe the XML/MusicXML libraries, their public APIs, and the relevant scripts (bench/perf/verify).

## Tooling / tests
- Tighten the perf regression thresholds in `perf/perf.spec.ts` (currently 20x) or make the limits environment-based so perf regressions are detected earlier without being too noisy.
- Add tests for failure-mode diagnostics (invalid root, missing attributes, invalid durations) to assert non-strict behavior stays deterministic.
