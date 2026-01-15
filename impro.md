# impro.md (root)

A living list of improvements for the overall repo (tooling, DX, CI, packaging, consistency).

## High priority

- [x] Fix Biome formatting failures and make `pnpm lint` green.
  - Enabled Tailwind directives parsing in Biome CSS parser.
  - Ignored generated artifacts (`.tmp-tscheck/`, `bench/results.json`).
  - Applied `biome check --write` fixes across the repo.

- [x] Clean up and commit the current repo changes.
  - Current status shows a mix of modified/untracked root files and folders (`AGENTS.md`, `scripts/`, `skills/`, `pnpm-lock.yaml`).
  - Ensure the intended files are committed and any accidental files are removed.

- [x] Commit the pnpm migration artifacts and remove npm-only artifacts.
  - Ensure `pnpm-lock.yaml` is committed.
  - Ensure `package-lock.json` stays deleted.
  - Consider adding a short "Package manager" section to README stating pnpm is canonical.

- [x] Add a stable way to get pnpm under Node 25 for contributors.
  - `.nvmrc` pins Node 25, but `corepack` wasn’t available in PATH in this environment.
  - Add a documented install path (recommended):
    - `corepack enable && corepack prepare pnpm@10.26.2 --activate` (or `npm i -g pnpm@10.26.2`).

- [x] Make skills packaging deterministic and tracked.
  - Repo guideline says `{skill-name}.zip` should exist next to each skill.
  - Right now only `skills/react-best-practices.zip` exists.
  - Standardized: `pnpm skills:test` builds zips and CI verifies the working tree stays clean.

## Medium priority

- [x] Add a CI workflow.
  - Suggested jobs:
    - `pnpm install --frozen-lockfile`
    - `pnpm lint`
    - `pnpm test`
    - `pnpm skills:test`

- [x] Normalize VS Code workspace files.
  - `.vscode/settings.json` now pins `biome.lsp.bin` which is good.
  - Removed empty `.vscode/launch.json` and gitignored it to avoid reintroducing noise.

- [x] Document environment-file semantics in one place.
  - Currently: Jest loads `.env.test(.local)`; bench loads `.env.local`/`.env`; Next loads `.env.local`.
  - Decision: keep bench reading `.env.local`/`.env` (simple local DX; no new env file tier).

## Low priority

- [x] Add `pnpm clean` script.
  - Remove `.next`, `.test-dist`, `.tmp-tscheck`, etc.

- [x] Add editorconfig (optional).
  - Standardize newline/indent rules beyond Biome.

- [x] Reduce repo noise from generated artifacts.
  - Audit `.gitignore` for `.jest-localstorage`, `.test-dist`, perf/bench outputs, etc.
  - Added ignore entries for `bench/results.json` and `.tmp-tscheck/` and removed them from git.
  - Removed tracked `.test-dist/` artifacts and kept it gitignored.
  - Consider adding more Biome force-ignore patterns for future generated folders.

- [x] Decide how to format/lint Markdown repo docs.
  - Kept Biome for code, and added Prettier for Markdown-only checks.
  - Scripts:
    - `pnpm md:check`
    - `pnpm md:format`
