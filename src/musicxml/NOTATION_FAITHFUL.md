# MusicXML notation-faithful contract

This document defines what “notation-faithful” means for this repository’s MusicXML → event-stream mapping.

## Definition

Notation-faithful output preserves the author’s notation and structural intent.

In particular:

- No repeat expansion
- No tie merging
- No interpretation that changes musical structure or duration representation

The mapper emits an event stream that:

- mirrors the MusicXML document’s structural hierarchy (score → parts → measures)
- attaches computed timing metadata (in divisions) without changing the represented note segments

## Non-goals

- Playback-oriented realization (repeat expansion, ornament realization)
- Voice/part inference beyond what MusicXML explicitly provides
- Tie merging into single sustained notes

## Strict vs permissive mode

The mapper supports two modes:

- `strict`: invalid inputs fail fast (throws) with a typed error
- `permissive`: invalid inputs emit diagnostics and continue when possible

In `permissive` mode, events must remain well-typed and adhere to invariants; missing data is represented as `null`/`undefined` values and/or explicit “unknown” enum members.

## Normalized event model

Events are emitted in document order.

Every event may include metadata:

- `path`: a path-like location (element names + indices) identifying the source node
- `pos`: an XML position (offset, optionally line/column if available)

### Core structural events

- `ScoreStart` / `ScoreEnd`
- `PartDef` (from `part-list`)
- `PartStart` / `PartEnd`
- `MeasureStart` / `MeasureEnd`

### Timing-related events

- `Divisions` (from `attributes/divisions`)
- `TimeSig` (from `attributes/time`)
- `KeySig` (from `attributes/key`)
- `Clef` (from `attributes/clef`)
- `Transpose` (from `attributes/transpose`, stored only)

### Note events

A note is emitted as a segment in divisions without merging across ties.

- `Note`
  - `voice`: MusicXML `voice` value (string)
  - `staff`: MusicXML `staff` value (number | undefined)
  - `tOnAbsDiv`: absolute onset time in divisions (number)
  - `durDiv`: duration in divisions (number)
  - `isRest`: boolean
  - `pitch`: `{ step, alter, octave } | null`
  - `chord`: boolean
  - `grace`: boolean
  - `cue`: boolean
  - `tie`: `{ start: boolean; stop: boolean }`

## Invariants

- `durDiv >= 0` for all `Note` events.
- `tOnAbsDiv >= 0` for all `Note` events.
- For a given part + voice, the cursor is updated only by:
  - normal note duration advances
  - `backup` (cursor moves backward)
  - `forward` (cursor moves forward)
  - `chord` notes do not advance the cursor
- If a `note` has a `chord` flag, it must have the same onset as the previous non-chord note within the same part + voice at that cursor location.
- Ties are represented as markers on segments (`start`/`stop`) and are not merged.

## Determinism

Given the same input bytes and options, the emitted event stream must be deterministic:

- same events
- same ordering
- same computed `tOnAbsDiv` values
- same diagnostics (in permissive mode)
