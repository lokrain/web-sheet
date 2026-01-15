# impro.md (root)

A living list of improvements for the overall repo (tooling, DX, CI, packaging, consistency).

## High priority

- [x] Fix Biome formatting failures and make `pnpm lint` green.
  - Enabled Tailwind directives parsing in Biome CSS parser.
  - Ignored generated artifacts (`.tmp-tscheck/`, `bench/results.json`).
  - Applied `biome check --write` fixes across the repo.

- [ ] Clean up and commit the current repo changes.
  - Current status shows a mix of modified/untracked root files and folders (`AGENTS.md`, `scripts/`, `skills/`, `pnpm-lock.yaml`).
  - Ensure the intended files are committed and any accidental files are removed.

- [ ] Commit the pnpm migration artifacts and remove npm-only artifacts.
  - Ensure `pnpm-lock.yaml` is committed.
  - Ensure `package-lock.json` stays deleted.
  - Consider adding a short "Package manager" section to README stating pnpm is canonical.

- [ ] Add a stable way to get pnpm under Node 25 for contributors.
  - `.nvmrc` pins Node 25, but `corepack` wasn’t available in PATH in this environment.
  - Add a documented install path (recommended):
    - `corepack enable && corepack prepare pnpm@10.26.2 --activate` (or `npm i -g pnpm@10.26.2`).

- [ ] Make skills packaging deterministic and tracked.
  - Repo guideline says `{skill-name}.zip` should exist next to each skill.
  - Right now only `skills/react-best-practices.zip` exists.
  - Consider standardizing: `pnpm skills:test` should build all zips, and CI should verify zips are up to date.

## Medium priority

- [ ] Add a CI workflow.
  - Suggested jobs:
    - `pnpm install --frozen-lockfile`
    - `pnpm lint`
    - `pnpm test`
    - `pnpm skills:test`

- [ ] Normalize VS Code workspace files.
  - `.vscode/settings.json` now pins `biome.lsp.bin` which is good.
  - `.vscode/launch.json` is `{}` and seems accidental/noise.

- [ ] Document environment-file semantics in one place.
  - Currently: Jest loads `.env.test(.local)`; bench loads `.env.local`/`.env`; Next loads `.env.local`.
  - Decide whether to keep bench `.env.local` loading (it overlaps with Next) or switch to `.env.bench`.

## Low priority

- [ ] Add `pnpm clean` script.
  - Remove `.next`, `.test-dist`, `.tmp-tscheck`, etc.

- [ ] Add editorconfig (optional).
  - Standardize newline/indent rules beyond Biome.

- [ ] Reduce repo noise from generated artifacts.
  - Audit `.gitignore` for `.jest-localstorage`, `.test-dist`, perf/bench outputs, etc.
  - Add ignore entries for `bench/results.json` and `.tmp-tscheck/` if they are generated.
  - Consider adding Biome force-ignore patterns for generated folders (ex: `!!**/.tmp-tscheck`).

- [ ] Decide how to format/lint Markdown repo docs.
  - Biome currently doesn’t process Markdown in this repo (so `biome check impro.md` is expected to skip).
  - Options:
    - leave Markdown un-linted
    - add a dedicated Markdown formatter/linter (Prettier/remark) for docs-only checks
