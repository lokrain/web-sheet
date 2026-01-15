# impro.md (root)

A living list of improvements for the overall repo (tooling, DX, CI, packaging, consistency). Items are removed or checked off as they’re implemented.

## Iteration rule

1. Add newly discovered improvements.
2. Implement the highest-leverage items that don’t require product decisions.
3. Remove/mark completed items.
4. Repeat.

## Now (highest leverage)

- [x] Keep the repo always-green locally + in CI.
  - Canonical command: `pnpm verify`.

- [x] Remove duplicate/accidental files.
  - Example: `skills/react-best-practices/rules/js-index-maps (1).md` looks like an accidental duplicate.

- [x] Add missing developer scripts.
  - `typecheck`: `tsc -p tsconfig.json --noEmit`
  - `lint:fix`: `biome check --write`
  - `ci`: run the same steps as CI locally

- [ ] Replace MusicXML mapping stub.
  - `src/musicxml/xml/stream-mapper.ts` currently exports a minimal stub to keep `pnpm typecheck` green.
  - Either implement the actual mapping pipeline or remove the public re-export.

## Tooling / DX

- [x] Tighten Biome scope + ignore list.
  - Ensure generated outputs stay ignored at both git + Biome level.
  - Keep Tailwind directives parsing enabled.
  - Consider adding Biome force-ignores for other common outputs (`!!**/.turbo`, etc.).

- [ ] Ensure pnpm availability story is unambiguous.
  - README should be pnpm-first and mention `corepack` path.
  - Consider adding `engineStrict` guidance (or a short troubleshooting section).

- [x] Add `pnpm typecheck` (separate from `next build`).
  - Useful for CI signals and faster feedback.

- [x] Add a dependency update mechanism.
  - Added Dependabot config.

## Next.js app hygiene

- [x] Add `tailwind.config.ts` even if Tailwind v4 can work without it.
  - Helps editor tooling (Tailwind IntelliSense) and makes intent explicit.

- [ ] Revisit `next.config.ts` headers.
  - `X-XSS-Protection` is legacy/deprecated in modern browsers.
  - Consider adding a CSP (or document why it’s omitted).
  - Consider whether `images.unoptimized: true` is intended long-term.

- [ ] Ensure UI component conventions are consistent.
  - shadcn/ui additions: verify `components.json` exists (if using shadcn CLI) and paths are stable.

## Skills system

- [x] Add a repo-level `skills/` policy check.
  - Every `skills/{name}/` should have: `SKILL.md`, `scripts/`, `rules/`, `metadata.json`.
  - Every skill should have a sibling `skills/{name}.zip`.
  - CI should fail if packing produces diffs (already enforced).

- [x] Remove accidental duplicates inside skills.
  - e.g. `js-index-maps (1).md`.
  - Consider adding a check in `scripts/test-skills.sh` for duplicate filenames (case-insensitive) and “copy” suffixes.

## Docs

- [x] Keep docs consistent and scoped.
  - Prettier is used for `*.md` only; Biome remains the code formatter.
  - Consider adding a small “Formatting” section in README describing `pnpm lint` vs `pnpm md:check`.

## Nice-to-haves

- [x] Add `.vscode/extensions.json` recommendations.
  - `biomejs.biome`
  - `bradlc.vscode-tailwindcss`

- [x] Add a `pnpm verify` script.
  - Runs: lint + md:check + typecheck + test + skills:test.
