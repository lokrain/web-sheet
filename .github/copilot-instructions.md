# Copilot Instructions (web-sheet)

## Big picture
- Next.js 16 App Router project in `src/app` with Tailwind; entry points are `src/app/layout.tsx`, `src/app/page.tsx`, and `src/app/globals.css`.
- Core domain logic is **XML parsing** (`src/xml`) and **MusicXML mapping** (`src/musicxml/xml`).
  - `src/xml` provides tokenization + event streaming APIs (`parseEvents*`, `parseEventsToSink`) and throws `XmlError` on failures.
  - `src/musicxml/xml` consumes `XmlEvent`s and maps them into `MusicXmlMapperEvent`s via reducer-style mappers.
  - Streaming pipeline: `mapMusicXmlScorePartwiseEventStream` (in `src/musicxml/xml/streaming.ts`) → `parseEventsToSink` → `dispatchXmlEvent`/`flushDispatch` (in `dispatch-streaming.ts`) → reducers (e.g., `note.ts`, `tempo.ts`).
  - The dispatch layer uses the MusicXML path tracker (`path.ts`) and name pooling (`createNamePool`) for stable element/attribute names; keep this flow intact when adding new reducers.

## Conventions & patterns
- Use the `@/` path alias (see `tsconfig.json`) instead of relative paths in source.
- MusicXML mapping uses **reducers with internal state** (`createReducerHandle` in `reducer.ts`); add new XML-mapped events by creating a reducer and registering it in `createReducers` inside `streaming.ts`.
- The XML module is **streaming-first**; prefer `parseEventsToSink` or async iterable APIs to avoid buffering entire documents.
- Error handling in XML/MusicXML code should return typed diagnostics (`MusicXmlDiagnostic` in `src/musicxml/xml/error.ts`) or throw `XmlError` for parser failures.

## Developer workflows (pnpm)
- Node 25 and pnpm 10.26.2 are required (`.nvmrc`, `package.json`).
- Dev/build: `pnpm dev`, `pnpm build`, `pnpm start`.
- Lint/format: `pnpm lint` (Biome), `pnpm lint:fix`, `pnpm format`; Markdown formatting uses `pnpm md:check` / `pnpm md:format`.
- Tests: `pnpm test` (Jest, uses `.env.test`/`.env.test.local`).
- Benchmarks/perf: `pnpm bench`, `pnpm bench:musicxml`, `pnpm perf:ci`, `pnpm perf:update-baseline`.
- Full local CI equivalent: `pnpm verify`.

## Env files
- Next.js loads `.env*` automatically; use `.env.local` for local dev.
- Jest loads `.env.test` and `.env.test.local` via `jest.setup.ts`.

## Examples to follow
- XML streaming + diagnostics: `src/xml/README.md`, `src/xml/public/*`.
- MusicXML streaming mapper: `src/musicxml/xml/streaming.ts`, `dispatch-streaming.ts`, and reducers in `src/musicxml/xml/*.ts`.
- Parser error shape: `src/xml/public/error.ts` and `src/musicxml/xml/error.ts`.
