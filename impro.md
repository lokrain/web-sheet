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

## EPIC 9 — Performance & Robustness

Status: `IN_PROGRESS`

### Story 9.1 — Allocation Discipline

Status: `BACKLOG`

- Task 9.1.1: Pool transient note collectors **[2]**
  - Status: `BACKLOG`
- Task 9.1.2: Intern element and attribute names **[2]**
  - Status: `BACKLOG`

### Story 9.2 — Benchmarks

Status: `DONE`

- Task 9.2.1: Create small-score benchmark **[1]**
  - Status: `DONE`
- Task 9.2.2: Create large-score benchmark **[2]**
  - Status: `DONE`

### Story 9.3 — Fuzzing

Status: `BACKLOG`

- Task 9.3.1: XML structure fuzz tests **[3]**
  - Status: `BACKLOG`
- Task 9.3.2: Timing semantics fuzz tests **[3]**
  - Status: `BACKLOG`
