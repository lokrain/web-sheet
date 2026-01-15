# impro.md (root)

This file is the repo’s single source of truth for ongoing improvements.

## How we work with this file

- We treat this file like a lightweight Jira board.
- Every **Epic**, **Story**, and **Task** has a **Status**.
- As work progresses, we update statuses (and add notes/links as needed).
- Statuses are **propagated** from Tasks → Stories → Epics (rules below).
- When an **Epic becomes DONE**, we **delete the Epic section** (including all its stories/tasks) to keep the file small.

### Statuses

Use one of:

- `BACKLOG` — known work, not started
- `READY` — well-scoped, ready to start
- `IN_PROGRESS` — actively being worked on (limit to a small number)
- `BLOCKED` — cannot proceed (explain why + what unblocks)
- `REVIEW` — implemented, awaiting review/verification
- `DONE` — complete (when an Epic is DONE, delete it)

### Status propagation (must follow)

We do not set Epic/Story status arbitrarily; we derive it from child items.

For a **Story**:

- `BACKLOG` if **all tasks** are `BACKLOG`
- `DONE` if **all tasks** are `DONE`
- otherwise it is at least `IN_PROGRESS`

For an **Epic**:

- `BACKLOG` if **all stories** are `BACKLOG`
- `DONE` if **all stories** are `DONE`
- otherwise it is at least `IN_PROGRESS`

Operationally, when updating this file:

1. Update Task statuses.
2. Recompute Story statuses from tasks.
3. Recompute Epic statuses from stories.
4. If any Epic is `DONE`, delete the Epic section entirely.

### Complexity metric

Fibonacci: **1, 2, 3, 5, 8, 13, 21**.

For this backlog: **all tasks are ≤ 3**. Anything larger must be decomposed.

---

## EPIC R1 — Repo follow-ups

Status: `BACKLOG`

### Story R1.1 — pnpm + Node 25 DX clarity

Status: `BACKLOG`

- Task R1.1.1: Ensure the pnpm availability story is unambiguous (README + troubleshooting) **[2]**
  - Status: `BACKLOG`

### Story R1.2 — Next.js security headers hygiene

Status: `BACKLOG`

- Task R1.2.1: Revisit `next.config.ts` headers (CSP decision + document intent) **[3]**
  - Status: `BACKLOG`

### Story R1.3 — shadcn/ui conventions

Status: `BACKLOG`

- Task R1.3.1: Verify `components.json` + shadcn paths and document conventions **[2]**
  - Status: `BACKLOG`

---

# MusicXML Notation-Faithful Implementation Backlog

Complexity metric: Fibonacci (1, 2, 3, 5, 8, 13, 21). **All tasks are ≤ 3**. Larger work is decomposed.

Completion criteria:

- All fixtures emit deterministic, notation-faithful event streams.
- No task exceeds complexity 3.
- No performance interpretation (repeat expansion, tie merging) is applied.

---

## EPIC 4 — Timing Engine (Notation-Faithful)

Status: `IN_PROGRESS`

### Story 4.1 — Divisions & State

Status: `DONE`

- Task 4.1.1: Parse attributes/divisions **[1]**
  - Status: `DONE`
- Task 4.1.2: Maintain divisions state per part **[2]**
  - Status: `DONE`

### Story 4.2 — Voice Cursor Model

Status: `DONE`

- Task 4.2.1: Initialize per-voice cursor model **[3]**
  - Status: `DONE`
- Task 4.2.2: Advance cursor on note duration **[2]**
  - Status: `DONE`

### Story 4.3 — Backup / Forward Semantics

Status: `DONE`

- Task 4.3.1: Parse backup elements and durations **[2]**
  - Status: `DONE`
- Task 4.3.2: Apply backup to voice cursor **[2]**
  - Status: `DONE`
- Task 4.3.3: Parse and apply forward elements **[2]**
  - Status: `DONE`

### Story 4.4 — Absolute Time Calculation

Status: `IN_PROGRESS`

- Task 4.4.1: Track measureStartAbsDiv per part **[2]**
  - Status: `BACKLOG`
- Task 4.4.2: Compute tOnAbsDiv for notes **[3]**
  - Status: `DONE`

---

## EPIC 5 — Note Semantics

Status: `IN_PROGRESS`

### Story 5.1 — Pitch & Rest Parsing

Status: `DONE`

- Task 5.1.1: Parse pitch step/alter/octave **[2]**
  - Status: `DONE`
- Task 5.1.2: Represent rests as duration-only notes **[1]**
  - Status: `DONE`

### Story 5.2 — Chords

Status: `BACKLOG`

- Task 5.2.1: Detect chord flag on notes **[1]**
  - Status: `BACKLOG`
- Task 5.2.2: Prevent cursor advance on chord notes **[2]**
  - Status: `BACKLOG`

### Story 5.3 — Ties (Notation-Faithful)

Status: `BACKLOG`

- Task 5.3.1: Parse tie start/stop markers **[2]**
  - Status: `BACKLOG`
- Task 5.3.2: Attach tie markers to NoteEvent segments **[2]**
  - Status: `BACKLOG`

### Story 5.4 — Grace & Cue Notes

Status: `BACKLOG`

- Task 5.4.1: Detect grace note flag **[2]**
  - Status: `BACKLOG`
- Task 5.4.2: Preserve cue note metadata **[1]**
  - Status: `BACKLOG`

---

## EPIC 6 — Attributes & State Changes

Status: `BACKLOG`

### Story 6.1 — Time Signature

Status: `BACKLOG`

- Task 6.1.1: Parse attributes/time beats & beat-type **[2]**
  - Status: `BACKLOG`
- Task 6.1.2: Emit TimeSig change events **[2]**
  - Status: `BACKLOG`

### Story 6.2 — Key Signature

Status: `BACKLOG`

- Task 6.2.1: Parse attributes/key fifths/mode **[2]**
  - Status: `BACKLOG`
- Task 6.2.2: Emit KeySig change events **[1]**
  - Status: `BACKLOG`

### Story 6.3 — Clefs, Staves, Transpose

Status: `BACKLOG`

- Task 6.3.1: Parse clef sign/line/octave-change **[2]**
  - Status: `BACKLOG`
- Task 6.3.2: Parse staves count **[1]**
  - Status: `BACKLOG`
- Task 6.3.3: Parse transpose attributes (store only) **[2]**
  - Status: `BACKLOG`

---

## EPIC 7 — Directions & Barlines

Status: `BACKLOG`

### Story 7.1 — Tempo Directions

Status: `BACKLOG`

- Task 7.1.1: Parse sound tempo attribute **[2]**
  - Status: `BACKLOG`
- Task 7.1.2: Parse metronome per-minute **[2]**
  - Status: `BACKLOG`
- Task 7.1.3: Emit TempoDirection events at cursor time **[3]**
  - Status: `BACKLOG`

### Story 7.2 — Dynamics & Text Directions

Status: `BACKLOG`

- Task 7.2.1: Parse dynamics glyphs (p, f, etc.) **[2]**
  - Status: `BACKLOG`
- Task 7.2.2: Parse textual direction words **[1]**
  - Status: `BACKLOG`

### Story 7.3 — Repeats & Endings (Structural Only)

Status: `BACKLOG`

- Task 7.3.1: Parse barline repeat forward/backward **[2]**
  - Status: `BACKLOG`
- Task 7.3.2: Parse ending start/stop numbers **[2]**
  - Status: `BACKLOG`

---

## EPIC 8 — Validation & Error Handling

Status: `BACKLOG`

### Story 8.1 — Typed Error Model

Status: `BACKLOG`

- Task 8.1.1: Define MusicXmlError codes enum **[2]**
  - Status: `BACKLOG`
- Task 8.1.2: Attach path/location to errors **[2]**
  - Status: `BACKLOG`

### Story 8.2 — Invariant Checks

Status: `BACKLOG`

- Task 8.2.1: Validate non-negative durations **[1]**
  - Status: `BACKLOG`
- Task 8.2.2: Detect chord without prior onset **[2]**
  - Status: `BACKLOG`
- Task 8.2.3: Detect cursor underflow on backup **[2]**
  - Status: `BACKLOG`

---

## EPIC 9 — Performance & Robustness

Status: `BACKLOG`

### Story 9.1 — Allocation Discipline

Status: `BACKLOG`

- Task 9.1.1: Pool transient note collectors **[2]**
  - Status: `BACKLOG`
- Task 9.1.2: Intern element and attribute names **[2]**
  - Status: `BACKLOG`

### Story 9.2 — Benchmarks

Status: `BACKLOG`

- Task 9.2.1: Create small-score benchmark **[1]**
  - Status: `BACKLOG`
- Task 9.2.2: Create large-score benchmark **[2]**
  - Status: `BACKLOG`

### Story 9.3 — Fuzzing

Status: `BACKLOG`

- Task 9.3.1: XML structure fuzz tests **[3]**
  - Status: `BACKLOG`
- Task 9.3.2: Timing semantics fuzz tests **[3]**
  - Status: `BACKLOG`

---

## EPIC 10 — Output & Integration

Status: `BACKLOG`

### Story 10.1 — Stable Event Stream API

Status: `BACKLOG`

- Task 10.1.1: Define TypeScript types for all events **[2]**
  - Status: `BACKLOG`
- Task 10.1.2: Export streaming async iterator API **[2]**
  - Status: `BACKLOG`

### Story 10.2 — Golden Trace Verification

Status: `BACKLOG`

- Task 10.2.1: Snapshot golden traces for fixtures **[2]**
  - Status: `BACKLOG`
- Task 10.2.2: CI diff tests against golden traces **[2]**
  - Status: `BACKLOG`
