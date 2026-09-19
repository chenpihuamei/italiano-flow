# Italiano Flow Diagnostic Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first independently usable stage of the approved vocabulary-and-reading redesign: the four-view mobile PWA, safe local-data migration, a 120-item adaptive diagnostic with three transparent results, a fully linked 50-word pilot lexicon, one compliant reading, and a tested deployment that can collect the learner profile needed to select the final 600 words.

**Architecture:** Keep the site framework-free and static, but split the monolithic application into small ES modules. Versioned JSON remains public in GitHub; IndexedDB stores device-local progress through a repository interface. The phase-one release uses 50 fully migrated lexeme nodes and one reading to validate the complete interaction model, then pauses for the user to take the diagnostic before a second implementation plan selects and authors the remaining 550 words and 17 readings.

**Tech Stack:** HTML5, CSS, browser ES modules, IndexedDB, Service Worker, Node.js 24, pnpm 11, Node test runner, Ajv 8.20.0, fake-indexeddb 6.2.5, Playwright Test 1.63.0, GitHub Actions, GitHub Pages.

## Global Constraints

- Canonical public source is `chenpihuamei/italiano-flow`; private learner records and QA evidence remain under Project_009.
- Main navigation contains only `Allenamento`, `Lettura`, `Lessico`, and `Impostazioni`.
- The home view exposes one primary `Inizia l'allenamento` action and one secondary diagnostic action.
- Exercise modes and CEFR level can change only in Settings.
- Diagnostic prompts, options, and definitions are Italian; Chinese appears only in post-answer explanations and reports.
- Diagnostic bank contains exactly 120 items with A1 12, A2 14, B1 20, B2 28, C1 30, and C2 16.
- A diagnostic run contains 45–60 items and always offers `Non lo so` without a guessing penalty.
- The three diagnostic outputs are receptive estimate, contextual-use score, and combined effective estimate; all are explicitly relative to the versioned reference set and are not certification.
- Phase one contains 50 complete pilot lexeme nodes and one complete reading; it must never claim that the 600-word/18-reading launch library is finished.
- Daily training defaults to 20 target words.
- Reading never reveals definitions before submission; post-submit feedback includes evidence, paraphrase, rationale, and linked lexemes.
- No account, remote answer upload, friend leaderboard, hidden analytics, paid API, or server-side AI.
- Public text rights status must be one of `original`, `public-domain`, `cc`, `licensed`, `excerpt`, or `link-only`; `user-local` is forbidden in public data.
- Existing local data is copied and verified before old `localStorage` keys can ever be removed.
- Every task follows red → green → refactor, ends with a focused commit, and leaves the branch runnable.
- Run execution in an isolated worktree created with `superpowers:using-git-worktrees`; do not develop directly on deployed `main`.

---

## Scope Boundary and Next Plan

This is the first of two implementation plans because the user explicitly chose “diagnostic first, personalized 600-word library second.” Completing this plan produces a deployable diagnostic release and a real learner profile. After the user completes the test, write a second plan that uses the saved report to author the remaining 550 lexeme nodes, add 17 readings, tune topic allocation, add the user-local article import experience, and complete the 600/18 launch gate. Do not invent that personalization before the diagnostic result exists.

## File Map

### Keep and modify

- `index.html` — semantic four-view application shell.
- `styles.css` — mobile-first visual system and component states.
- `manifest.webmanifest` — PWA metadata and shortcuts.
- `sw.js` — versioned shell/content caching and update behavior.
- `.github/workflows/deploy-pages.yml` — verify before deployment.
- `README.md` — truthful phase-one capabilities, privacy, commands, and limits.

### Replace after parity tests pass

- `app.js` — replaced by a small bootstrap importing `src/app.mjs`.
- `training-engine.mjs` — superseded by focused modules under `src/training/`.
- `data/learning-data.json` — its D01 reading and cards migrate into versioned reading/lexicon content.
- `data/resources.json` — removed because the Resources product area is removed.
- `data/vocabulary-training.json` — migrated into level-split lexicon files, then removed.

### Create

```text
package.json
pnpm-lock.yaml
playwright.config.mjs
scripts/serve.mjs
scripts/run-tests.mjs
scripts/validate-content.mjs
scripts/validate-public-rights.mjs
src/app.mjs
src/core/content-loader.mjs
src/core/router.mjs
src/storage/db.mjs
src/storage/legacy-migration.mjs
src/storage/user-repository.mjs
src/diagnostic/engine.mjs
src/diagnostic/scoring.mjs
src/training/queue.mjs
src/training/questions.mjs
src/training/mastery.mjs
src/reading/matcher.mjs
src/reading/scoring.mjs
src/ui/shell.mjs
src/ui/training-view.mjs
src/ui/diagnostic-view.mjs
src/ui/reading-view.mjs
src/ui/lexicon-view.mjs
src/ui/settings-view.mjs
data/manifest.json
data/sources.json
data/schemas/lexeme.schema.json
data/schemas/reading.schema.json
data/schemas/diagnostic-item.schema.json
data/lexicon/manifest.json
data/lexicon/a1.json
data/lexicon/a2.json
data/lexicon/b1.json
data/lexicon/b2.json
data/lexicon/c1.json
data/lexicon/c2.json
data/diagnostic/manifest.json
data/diagnostic/items.json
data/diagnostic/reference-bands.json
data/readings/manifest.json
data/readings/b2.json
tests/unit/*.test.mjs
tests/content/*.test.mjs
tests/e2e/app.spec.mjs
tests/e2e/migration.spec.mjs
```

---

### Task 1: Reproducible Toolchain and Test Gate

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `playwright.config.mjs`
- Create: `scripts/serve.mjs`
- Create: `scripts/run-tests.mjs`
- Create: `tests/unit/repository-contract.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: static repository root.
- Produces: `pnpm test`, `pnpm test:content`, `pnpm test:e2e`, `pnpm verify`, and a local server at `http://127.0.0.1:4173`.

- [ ] **Step 1: Write the failing repository contract test**

```js
// tests/unit/repository-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("pins the phase-one toolchain and exposes verification commands", async () => {
  const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.packageManager, "pnpm@11.19.0");
  assert.equal(pkg.engines.node, ">=24.19.0");
  assert.equal(pkg.devDependencies.ajv, "8.20.0");
  assert.equal(pkg.devDependencies["fake-indexeddb"], "6.2.5");
  assert.equal(pkg.devDependencies["@playwright/test"], "1.63.0");
  assert.equal(pkg.scripts.verify, "pnpm test && pnpm test:content && pnpm test:e2e");
});
```

- [ ] **Step 2: Run the test and verify the missing-package failure**

Run in PowerShell:

```powershell
$nodeRuntime = 'C:\Users\Ludovico Chen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $nodeRuntime --test tests/unit/repository-contract.test.mjs
```

Expected: FAIL with `ENOENT` for `package.json`.

- [ ] **Step 3: Add the pinned project manifest**

```json
{
  "name": "italiano-flow",
  "version": "0.3.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.19.0",
  "engines": { "node": ">=24.19.0" },
  "scripts": {
    "serve": "node scripts/serve.mjs",
    "test": "node scripts/run-tests.mjs",
    "test:content": "node scripts/validate-content.mjs && node scripts/validate-public-rights.mjs",
    "test:e2e": "playwright test",
    "verify": "pnpm test && pnpm test:content && pnpm test:e2e"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "ajv": "8.20.0",
    "fake-indexeddb": "6.2.5"
  }
}
```

Create a Windows-safe test launcher so `pnpm test` does not depend on shell glob expansion:

```js
// scripts/run-tests.mjs
import { glob } from "node:fs/promises";
import { spawn } from "node:child_process";

const requested = process.argv.slice(2).filter((argument) => argument !== "--");
const discovered = [];
if (!requested.length) {
  for (const pattern of ["tests/unit/**/*.test.mjs", "tests/content/**/*.test.mjs"]) {
    for await (const file of glob(pattern)) discovered.push(file);
  }
}
const files = requested.length ? requested : discovered.sort();
if (!files.length) throw new Error("No unit or content tests found");
const child = spawn(process.execPath, ["--test", "--test-reporter=spec", ...files], { stdio: "inherit" });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
```

Create `scripts/serve.mjs` as a traversal-safe static server. Resolve requests against the repository root, reject any resolved path outside it, map `.mjs` and `.js` to `text/javascript; charset=utf-8`, `.json` to `application/json; charset=utf-8`, and default `/` to `/index.html`. Export `createStaticServer({ root, host, port })` so the server has a unit-testable interface; only call `.listen()` when the module is the entry point.

Create `playwright.config.mjs` with:

```js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "test-results/html", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "pnpm serve",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true
  },
  projects: [
    { name: "mobile-375", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }
  ]
});
```

Add `node_modules/`, `test-results/`, and `playwright-report/` to `.gitignore`. Generate and commit `pnpm-lock.yaml` with the bundled pnpm CLI.

- [ ] **Step 4: Install and run the contract test**

```powershell
$nodeRuntime = 'C:\Users\Ludovico Chen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$pnpmCli = 'C:\Users\Ludovico Chen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs'
& $nodeRuntime $pnpmCli install
& $nodeRuntime $pnpmCli exec playwright install chromium
& $nodeRuntime --test tests/unit/repository-contract.test.mjs
```

Expected: dependency and Chromium installation succeed and the test passes.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml playwright.config.mjs scripts/serve.mjs scripts/run-tests.mjs tests/unit/repository-contract.test.mjs .gitignore
git commit -m "test: add reproducible verification toolchain"
```

---

### Task 2: Versioned Content Contracts and Rights Gate

**Files:**
- Create: `data/manifest.json`
- Create: `data/sources.json`
- Create: `data/schemas/lexeme.schema.json`
- Create: `data/schemas/reading.schema.json`
- Create: `data/schemas/diagnostic-item.schema.json`
- Create: `scripts/validate-content.mjs`
- Create: `scripts/validate-public-rights.mjs`
- Create: `tests/content/content-contract.test.mjs`
- Create: `tests/content/rights-policy.test.mjs`

**Interfaces:**
- Produces: `validateContent(root): Promise<{lexemes:number, diagnosticItems:number, readings:number}>`.
- Produces: `validatePublicRights(reading): string[]`; an empty array means publishable metadata.
- Data consumers can rely on stable string IDs, `contentVersion`, and manifest file lists.

- [ ] **Step 1: Write failing schema and rights tests**

```js
// tests/content/rights-policy.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { validatePublicRights } from "../../scripts/validate-public-rights.mjs";

const base = {
  id: "reading-b2-ai-work-001",
  title: "L'IA nelle imprese",
  body: ["Testo editoriale originale."],
  rights: { status: "original", reviewedAt: "2026-09-19" }
};

test("accepts original text with a review date", () => {
  assert.deepEqual(validatePublicRights(base), []);
});

test("blocks link-only and user-local bodies from public data", () => {
  assert.match(validatePublicRights({ ...base, rights: { status: "link-only", sourceUrl: "https://example.org" } }).join("\n"), /link-only.*body/i);
  assert.match(validatePublicRights({ ...base, rights: { status: "user-local" } }).join("\n"), /user-local/i);
});

test("requires attribution fields for excerpts", () => {
  const errors = validatePublicRights({ ...base, rights: { status: "excerpt", sourceUrl: "https://example.org" } });
  assert.match(errors.join("\n"), /author|publisher|excerptPurpose/i);
});
```

`tests/content/content-contract.test.mjs` must import `Ajv2020` from `ajv/dist/2020.js`, compile all three schemas, then assert that a valid fixture passes and each missing required field fails with an Ajv error path.

- [ ] **Step 2: Run and verify module-not-found failures**

Run: `pnpm test -- tests/content/rights-policy.test.mjs tests/content/content-contract.test.mjs`

Expected: FAIL because validator modules and schemas do not exist.

- [ ] **Step 3: Add the exact contracts**

Use JSON Schema draft 2020-12. Required lexeme fields:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://italiano-flow.dev/schemas/lexeme.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "lemma", "partOfSpeech", "cefr", "levelEvidence", "senses", "forms", "collocations", "phrases", "morphology", "relations", "examples", "exerciseRefs", "sourceRefs"],
  "properties": {
    "id": { "type": "string", "pattern": "^it-[a-z0-9-]+$" },
    "lemma": { "type": "string", "minLength": 1 },
    "partOfSpeech": { "type": "string", "minLength": 1 },
    "cefr": { "enum": ["A1", "A2", "B1", "B2", "C1", "C2"] },
    "levelEvidence": { "type": "array", "minItems": 1, "items": { "type": "object", "required": ["sourceId", "label", "confidence"], "properties": { "sourceId": { "type": "string" }, "label": { "enum": ["A1", "A2", "B1", "B2", "C1", "C2"] }, "confidence": { "enum": ["low", "medium", "high"] } } } },
    "senses": { "type": "array", "minItems": 1, "items": { "type": "object", "required": ["id", "definitionIt", "definitionZh", "register", "structures", "priority"], "properties": { "id": { "type": "string" }, "definitionIt": { "type": "string" }, "definitionZh": { "type": "string" }, "register": { "type": "string" }, "regionality": { "type": ["string", "null"] }, "structures": { "type": "array", "items": { "type": "string" } }, "priority": { "type": "integer", "minimum": 1 } } } },
    "forms": { "type": "array", "items": { "type": "object", "required": ["label", "value"], "properties": { "label": { "type": "string" }, "value": { "type": "string" } } } },
    "collocations": { "type": "array", "items": { "type": "string" } },
    "phrases": { "type": "array", "items": { "type": "object", "required": ["text", "meaningIt", "meaningZh"], "properties": { "text": { "type": "string" }, "meaningIt": { "type": "string" }, "meaningZh": { "type": "string" } } } },
    "morphology": { "type": "object", "required": ["root", "prefixes", "suffixes", "familyIds"], "properties": { "root": { "type": ["string", "null"] }, "prefixes": { "type": "array", "items": { "type": "string" } }, "suffixes": { "type": "array", "items": { "type": "string" } }, "familyIds": { "type": "array", "items": { "type": "string" } } } },
    "relations": { "type": "object", "required": ["synonymIds", "antonymIds", "lookalikeIds", "confusableIds", "relatedIds"], "properties": { "synonymIds": { "$ref": "#/$defs/idArray" }, "antonymIds": { "$ref": "#/$defs/idArray" }, "lookalikeIds": { "$ref": "#/$defs/idArray" }, "confusableIds": { "$ref": "#/$defs/idArray" }, "relatedIds": { "$ref": "#/$defs/idArray" } } },
    "examples": { "type": "array", "minItems": 3, "items": { "type": "object", "required": ["id", "senseId", "text", "translationZh", "noteZh", "domain"], "properties": { "id": { "type": "string" }, "senseId": { "type": "string" }, "text": { "type": "string" }, "translationZh": { "type": "string" }, "noteZh": { "type": "string" }, "domain": { "type": "string" } } },
    "exerciseRefs": { "$ref": "#/$defs/idArray" },
    "sourceRefs": { "$ref": "#/$defs/idArray" }
  },
  "$defs": { "idArray": { "type": "array", "items": { "type": "string" }, "uniqueItems": true } }
}
```

The reading schema must require `id`, `title`, `cefr`, `topics`, `wordCount`, `estimatedMinutes`, `body`, `targetWordIds`, `connectorIds`, `questionIds`, `questions`, `sourceRefs`, and `rights`. A question requires `id`, `type`, `prompt`, `options`, `correctOptionId`, `evidenceParagraph`, `evidenceText`, `paraphraseIt`, `rationaleZh`, and `linkedWordIds`.

The diagnostic-item schema must require `id`, `cefr`, `dimension`, `type`, `prompt`, `options`, `correctOptionId`, `explanationIt`, `explanationZh`, `lemma`, `tags`, and `sourceRefs`. `dimension` is `receptive` or `contextual`; options contain stable `id` and Italian `text` only.

`data/manifest.json` starts at `contentVersion: "1.0.0-phase1-dev.0"`, `stage: "contracts"`, and truthful counts `{ lexemes: 0, diagnosticItems: 0, readings: 0 }`. The validator accepts an empty file list only in the `contracts` stage. Task 5 changes the manifest to `pilot-lexicon` and `50/0/0`; Task 6 changes it to `diagnostic-ready` and `50/120/0`; Task 12 finalizes `contentVersion: "1.0.0-phase1"`, `stage: "diagnostic-release"`, and `50/120/1`.

- [ ] **Step 4: Implement content and rights validation**

`scripts/validate-public-rights.mjs` exports `validatePublicRights` and rejects missing status, unknown status, `user-local`, bodies on `link-only`, incomplete excerpt attribution, missing CC license/attribution, and missing `permissionEvidence` on licensed text.

`scripts/validate-content.mjs` must:

1. Load every file named by each manifest.
2. Compile each schema once with `Ajv2020({ allErrors: true, strict: true })`.
3. Reject duplicate IDs across files.
4. Check every source reference exists in `data/sources.json`.
5. Check every lexeme relation target exists and reciprocal relations return to the source.
6. Check reading target/evidence word IDs exist.
7. Check diagnostic counts and level allocation exactly match the global constraints.
8. Check no Chinese Unicode code point occurs in diagnostic prompt or option text.
9. Call the rights validator for each reading.
10. Print one deterministic summary line: `CONTENT PASS lexemes=50 diagnostic=120 readings=1`.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test && pnpm test:content`

Expected: unit and content commands pass. In the `contracts` stage, validation compiles all schemas, validates the root/source manifests, runs rights-policy fixtures, and reports `CONTENT PASS lexemes=0 diagnostic=0 readings=0`. It must not suppress schema or rights errors.

```bash
git add data/manifest.json data/sources.json data/schemas scripts/validate-content.mjs scripts/validate-public-rights.mjs tests/content
git commit -m "feat: define versioned content and rights contracts"
```

---

### Task 3: IndexedDB Repository and Non-Destructive Legacy Migration

**Files:**
- Create: `src/storage/db.mjs`
- Create: `src/storage/user-repository.mjs`
- Create: `src/storage/legacy-migration.mjs`
- Create: `tests/unit/storage.test.mjs`
- Create: `tests/unit/legacy-migration.test.mjs`

**Interfaces:**
- `openItalianoFlowDb(indexedDBFactory = globalThis.indexedDB): Promise<IDBDatabase>`.
- `createUserRepository(db)` returns `getSetting`, `setSetting`, `getWordProgress`, `putWordProgress`, `addAttempt`, `listMistakes`, `saveSession`, `getSession`, `deleteSession`, `saveDiagnosticReport`, `listDiagnosticReports`, `exportAll`, `importAll`, and `clearAll`.
- `migrateLegacyState({ repository, storage }): Promise<{status, migrated, ignored, errors}>`.

- [ ] **Step 1: Write failing storage tests using fake-indexeddb**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { openItalianoFlowDb } from "../../src/storage/db.mjs";
import { createUserRepository } from "../../src/storage/user-repository.mjs";

test("persists settings, word progress, attempts, sessions, and reports", async () => {
  const db = await openItalianoFlowDb(new IDBFactory());
  const repo = createUserRepository(db);
  await repo.setSetting("targetCefr", "B2");
  await repo.putWordProgress({ wordId: "it-sodo", status: "learning", attempts: 1, correct: 0 });
  await repo.addAttempt({ id: "attempt-1", wordId: "it-sodo", correct: false, questionType: "phrase", answeredAt: "2026-09-19T10:00:00.000Z" });
  await repo.saveSession({ id: "session-1", type: "training", index: 3, itemIds: ["q1", "q2"] });
  await repo.saveDiagnosticReport({ id: "report-1", contentVersion: "1.0.0-phase1", contextualScore: 62 });
  assert.equal(await repo.getSetting("targetCefr"), "B2");
  assert.equal((await repo.listMistakes())[0].wordId, "it-sodo");
  assert.equal((await repo.getSession("session-1")).index, 3);
  assert.equal((await repo.listDiagnosticReports())[0].id, "report-1");
});
```

Add a second test that exports this database, imports it into a fresh `IDBFactory`, and receives the same settings/progress/report records. Pass a payload with `schemaVersion: 999` and assert `importAll` rejects before modifying any store. Call `clearAll()` and assert every store is empty.

The migration test seeds these exact keys:

```js
{
  "italiano-flow:opened": "[\"D01-V01\"]",
  "italiano-flow:training-stats": "{\"VF-001\":{\"attempts\":2,\"correct\":1,\"streak\":0,\"lastReviewed\":\"2026-09-19T09:00:00.000Z\",\"status\":\"learning\"}}",
  "italiano-flow:review-index": "4",
  "italiano-flow:last-subtitle": "{\"cueCount\":2}"
}
```

Assert training stats become `wordProgress`, opened vocabulary becomes `learning`, review index becomes migration metadata, subtitle summary is listed under `ignored`, and every original key remains present.

- [ ] **Step 2: Run and verify imports fail**

Run: `pnpm test -- tests/unit/storage.test.mjs tests/unit/legacy-migration.test.mjs`

Expected: FAIL with missing storage modules.

- [ ] **Step 3: Implement database version 1**

Create database `italiano-flow`, version `1`, with stores:

```js
export const STORE_NAMES = Object.freeze({
  settings: "settings",
  wordProgress: "wordProgress",
  attempts: "attempts",
  sessions: "sessions",
  diagnosticReports: "diagnosticReports",
  readingProgress: "readingProgress",
  localContent: "localContent",
  migrationMeta: "migrationMeta"
});
```

Key paths: settings `key`, wordProgress `wordId`, attempts `id`, sessions `id`, diagnosticReports `id`, readingProgress `readingId`, localContent `id`, migrationMeta `id`. Add indexes `attempts.wordId`, `attempts.correct`, and `wordProgress.status`.

Repository methods wrap each request in a Promise and resolve only after the transaction completes. `exportAll()` returns a JSON-safe object keyed by store name with `schemaVersion: 1` and `exportedAt`. `importAll()` validates the entire payload and all IDs before starting one read-write transaction across the stores; any failure aborts the transaction. `clearAll()` clears all stores in one transaction.

- [ ] **Step 4: Implement idempotent migration**

Map `VF-001` to `it-sodo` and every other old ID through a checked mapping exported as `LEGACY_WORD_IDS`. Reject duplicate destination IDs. Write migration marker `legacy-localstorage-v1` only after all repository writes resolve. Never call `removeItem` in this version. Return malformed JSON under `errors` without aborting other valid keys.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test -- tests/unit/storage.test.mjs tests/unit/legacy-migration.test.mjs`

Expected: PASS, including a second migration run returning `status: "already-migrated"` and no duplicate attempts.

```bash
git add src/storage tests/unit/storage.test.mjs tests/unit/legacy-migration.test.mjs
git commit -m "feat: add local repository and legacy migration"
```

---

### Task 4: Four-View Shell and Settings-Only Controls

**Files:**
- Create: `src/core/router.mjs`
- Create: `src/ui/shell.mjs`
- Create: `src/ui/settings-view.mjs`
- Create: `src/app.mjs`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`
- Create: `tests/unit/router.test.mjs`
- Create: `tests/e2e/shell.spec.mjs`

**Interfaces:**
- `createRouter({root, initialView, onChange})` exposes `navigate(view)` and `current()`.
- `renderShell(root)` creates stable containers `#trainingView`, `#readingView`, `#lexiconView`, `#settingsView`.
- `mountSettingsView(container, {repository, onChanged})` persists `targetCefr`, `questionTypes`, `dailyGoal`, `showChineseFeedback`, and `allowStretchWords`.

- [ ] **Step 1: Write failing router and shell tests**

Router unit test:

```js
test("accepts only the four approved views", () => {
  const router = createRouter({ root: fakeRoot, initialView: "training", onChange: () => {} });
  assert.equal(router.current(), "training");
  assert.throws(() => router.navigate("subtitles"), /Unknown view/);
  assert.throws(() => router.navigate("progress"), /Unknown view/);
});
```

Playwright shell test asserts:

```js
await expect(page.getByRole("button", { name: "Inizia l'allenamento" })).toBeVisible();
await expect(page.getByRole("button", { name: "Testa il tuo vocabolario" })).toBeVisible();
await expect(page.locator("nav [data-nav]")).toHaveCount(4);
await expect(page.locator("body")).not.toContainText(/Sottotitoli|Progressi|Risorse selezionate/);
```

- [ ] **Step 2: Run tests and verify old UI fails**

Run: `pnpm test -- tests/unit/router.test.mjs` and `pnpm test:e2e -- tests/e2e/shell.spec.mjs --project=mobile-375`.

Expected: router import fails and old DOM fails the four-view assertions.

- [ ] **Step 3: Replace the shell with semantic four-view markup**

The page body must contain this stable structure:

```html
<a class="skip-link" href="#main-content">Vai al contenuto</a>
<div class="app-shell" id="appShell">
  <header class="topbar">
    <a class="brand-lockup" href="#training" aria-label="Italiano Flow — Allenamento">Italiano Flow</a>
    <button id="installButton" type="button" hidden>Installa</button>
  </header>
  <main id="main-content">
    <section class="view is-active" id="trainingView" data-view="training" aria-labelledby="training-title"></section>
    <section class="view" id="readingView" data-view="reading" aria-labelledby="reading-title" hidden></section>
    <section class="view" id="lexiconView" data-view="lexicon" aria-labelledby="lexicon-title" hidden></section>
    <section class="view" id="settingsView" data-view="settings" aria-labelledby="settings-title" hidden></section>
  </main>
  <nav class="bottom-nav" aria-label="Navigazione principale">
    <button data-nav="training" aria-current="page">Allenamento</button>
    <button data-nav="reading">Lettura</button>
    <button data-nav="lexicon">Lessico</button>
    <button data-nav="settings">Impostazioni</button>
  </nav>
</div>
<script type="module" src="./app.js"></script>
```

`app.js` becomes a safe bootstrap without interpolating error text into HTML:

```js
import { startApp } from "./src/app.mjs";
startApp(document).catch((error) => {
  const main = document.querySelector("#main-content");
  const section = document.createElement("section");
  section.className = "system-card";
  const title = document.createElement("h1");
  title.textContent = "Impossibile avviare Italiano Flow";
  const message = document.createElement("p");
  message.textContent = String(error.message);
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Riprova";
  retry.addEventListener("click", () => location.reload());
  section.append(title, message, retry);
  main.replaceChildren(section);
});
```

Render the Training landing with the primary and diagnostic buttons, daily 20-word summary, resume card when a saved session exists, and one recommended-reading card. Do not render question-type controls there.

Render Settings with one CEFR radio group (`diagnostic`, A1–C2), checkboxes for `meaning`, `lookalike`, `context`, `grammar`, `sense`, `phrase`, and `paraphrase`, a daily-goal number input defaulting to 20, and the two boolean preferences. Prevent saving zero enabled question types and announce the error in an `aria-live` region.

Add `Esporta i miei dati`, `Importa dati`, and `Cancella dati locali`. Export downloads the exact `exportAll()` payload. Import first validates and previews record counts, then requires a confirmation click before `importAll()`. Clearing requires the user to type `CANCELLA`; cancel or a different string changes nothing. Add Playwright assertions for export filename, rejected wrong schema version, successful round trip, and guarded clear.

- [ ] **Step 4: Complete mobile-first styles**

Reuse the current color variables where they remain readable. Define visible `:focus-visible`, 44px minimum controls, safe-area bottom padding, one-column mobile layout, two-column tablet cards, and max-width desktop shell. Add `@media (prefers-reduced-motion: reduce)` that removes smooth scrolling and transforms without hiding content.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test && pnpm test:e2e -- tests/e2e/shell.spec.mjs`.

Expected: four navigation tests pass at all three viewports; no horizontal overflow.

```bash
git add index.html styles.css app.js src/app.mjs src/core/router.mjs src/ui/shell.mjs src/ui/settings-view.mjs tests/unit/router.test.mjs tests/e2e/shell.spec.mjs
git commit -m "feat: focus the app on vocabulary and reading"
```

---

### Task 5: Migrate the 50-Word Pilot into Linked Lexeme Nodes

**Files:**
- Create: `data/lexicon/manifest.json`
- Create: `data/lexicon/a1.json`
- Create: `data/lexicon/a2.json`
- Create: `data/lexicon/b1.json`
- Create: `data/lexicon/b2.json`
- Create: `data/lexicon/c1.json`
- Create: `data/lexicon/c2.json`
- Create: `tests/content/lexicon-quality.test.mjs`
- Modify: `data/manifest.json`
- Modify: `src/storage/legacy-migration.mjs`

**Interfaces:**
- Produces 50 lexemes conforming to the schema.
- `data/lexicon/manifest.json` exposes `{contentVersion, files, countsByLevel, total}`.
- Every legacy `VF-*` ID maps to exactly one stable `it-*` ID.

- [ ] **Step 1: Write the failing editorial quality test**

The test must assert:

```js
assert.equal(lexemes.length, 50);
assert.equal(new Set(lexemes.map((word) => word.id)).size, 50);
assert.equal(lexemes.every((word) => word.examples.length >= 3), true);
assert.equal(lexemes.every((word) => word.senses.length >= 1), true);
assert.equal(lexemes.every((word) => word.levelEvidence.length >= 1), true);
assert.equal(lexemes.some((word) => word.lemma === "sodo" && word.phrases.some((phrase) => phrase.text === "andare al sodo")), true);
assert.equal(lexemes.some((word) => word.lemma === "tenere" && word.phrases.some((phrase) => phrase.text === "tenere a qualcosa")), true);
```

For every reciprocal relation type, assert `target.relations[type].includes(source.id)`. Assert all Italian examples contain at least four tokens and no two examples in the same node are identical after lowercasing and punctuation removal.

- [ ] **Step 2: Run and verify missing-data failure**

Run: `pnpm test -- tests/content/lexicon-quality.test.mjs`

Expected: FAIL because the level files do not exist.

- [ ] **Step 3: Editorially migrate all 50 words**

Use the existing 50-word deck as source material, not as automatically trusted output. For each word:

1. Assign a stable slug ID such as `it-sodo`, never the old ordinal.
2. Convert the Italian and Chinese definitions into at least one sense.
3. Preserve and review all three examples; correct unnatural tense, voice, register, or collocation before import.
4. Split fixed expressions into `phrases`.
5. Convert only relationships whose target is also one of the 50 pilot nodes. Put non-node comparisons into the relevant explanation, not a broken ID.
6. Add source IDs and confidence.
7. Ensure `sodo`, `tenere`, `esasperare`, `andarsene`, and the interview/work vocabulary already recorded in Project_009 are represented if they exist in the approved 50; do not add a 51st node in this phase.

The sum of `countsByLevel` must be 50. Empty level files are valid JSON arrays in phase one but remain listed in the manifest. Update the root manifest to `contentVersion: "1.0.0-phase1-dev.1"`, `stage: "pilot-lexicon"`, and counts `50/0/0`.

- [ ] **Step 4: Complete the legacy ID map and run validation**

Run: `pnpm test -- tests/content/lexicon-quality.test.mjs tests/unit/legacy-migration.test.mjs` and `pnpm test:content`.

Expected: all 50 nodes and legacy mappings pass; no broken relationship IDs.

- [ ] **Step 5: Commit**

```bash
git add data/manifest.json data/lexicon src/storage/legacy-migration.mjs tests/content/lexicon-quality.test.mjs tests/unit/legacy-migration.test.mjs
git commit -m "feat: migrate the 50-word linked pilot lexicon"
```

---

### Task 6: Author and Validate the 120-Item Diagnostic Bank

**Files:**
- Create: `data/diagnostic/manifest.json`
- Create: `data/diagnostic/items.json`
- Create: `data/diagnostic/reference-bands.json`
- Create: `tests/content/diagnostic-bank.test.mjs`
- Modify: `data/manifest.json`
- Modify: `data/sources.json`

**Interfaces:**
- `items.json` is a flat 120-item array.
- `reference-bands.json` exposes ordered bands with `{cefr, targetNodeCount}` using the approved 600 allocation: 20, 30, 70, 210, 220, 50.
- The report label must be `stima rispetto alle 600 parole-obiettivo Italiano Flow v1`, not total Italian vocabulary.

- [ ] **Step 1: Write the failing bank test**

```js
const countBy = (values, key) => values.reduce((counts, value) => {
  counts[value[key]] = (counts[value[key]] || 0) + 1;
  return counts;
}, {});

const expected = { A1: 12, A2: 14, B1: 20, B2: 28, C1: 30, C2: 16 };
assert.deepEqual(countBy(items, "cefr"), expected);
assert.equal(items.length, 120);
assert.equal(items.every((item) => item.options.length === 4), true);
assert.equal(items.every((item) => new Set(item.options.map((option) => option.id)).size === 4), true);
assert.equal(items.every((item) => item.options.some((option) => option.id === item.correctOptionId)), true);
assert.equal(items.every((item) => !/[\u3400-\u9fff]/u.test(item.prompt + item.options.map((option) => option.text).join(""))), true);
```

Also assert each level has at least three receptive and three contextual items, all prompts are unique, and every explanation has both Italian and Chinese.

- [ ] **Step 2: Run and verify missing bank failure**

Run: `pnpm test -- tests/content/diagnostic-bank.test.mjs`

Expected: FAIL because diagnostic files do not exist.

- [ ] **Step 3: Author the bank in six reviewed batches**

Use these exact item totals and minimum dimension balance:

| Level | Total | Receptive | Contextual |
| --- | ---: | ---: | ---: |
| A1 | 12 | 6 | 6 |
| A2 | 14 | 7 | 7 |
| B1 | 20 | 10 | 10 |
| B2 | 28 | 14 | 14 |
| C1 | 30 | 15 | 15 |
| C2 | 16 | 8 | 8 |

Allowed types are `meaning`, `paraphrase`, `collocation`, `context-cloze`, and `form-choice`. Each distractor must be plausible for form, register, collocation, or sense; no comic or obviously unrelated distractors. `Non lo so` is added by the UI and is not one of the four stored options.

For A1–B2, cite the Università per Stranieri di Perugia Profilo lexical inventory where applicable. For C1–C2, store editorial source, domain, register, and `confidence: "medium"` unless a specific authoritative source supports a stronger label. Do not claim the CEFR itself publishes a universal word list.

- [ ] **Step 4: Add the honest reference manifest**

```json
{
  "version": "italiano-flow-reference-v1",
  "labelIt": "600 parole-obiettivo Italiano Flow v1",
  "labelZh": "Italiano Flow 第一版600个目标词",
  "notCertification": true,
  "bands": [
    { "cefr": "A1", "targetNodeCount": 20 },
    { "cefr": "A2", "targetNodeCount": 30 },
    { "cefr": "B1", "targetNodeCount": 70 },
    { "cefr": "B2", "targetNodeCount": 210 },
    { "cefr": "C1", "targetNodeCount": 220 },
    { "cefr": "C2", "targetNodeCount": 50 }
  ]
}
```

Update the root manifest to `contentVersion: "1.0.0-phase1-dev.2"`, `stage: "diagnostic-ready"`, and counts `50/120/0`.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test -- tests/content/diagnostic-bank.test.mjs && pnpm test:content`

Expected: 120 items pass exact count, language, answer, uniqueness, and source checks.

```bash
git add data/manifest.json data/diagnostic data/sources.json tests/content/diagnostic-bank.test.mjs
git commit -m "content: add the 120-item Italian diagnostic bank"
```

---

### Task 7: Deterministic Adaptive Selection Engine

**Files:**
- Create: `src/diagnostic/engine.mjs`
- Create: `tests/unit/diagnostic-engine.test.mjs`

**Interfaces:**
- `createDiagnosticSession({items, contentVersion, seed}): DiagnosticSession`.
- `recordDiagnosticAnswer(session, {itemId, optionId}): DiagnosticSession` returns a new serializable state.
- `nextDiagnosticItem(session, items): DiagnosticItem | null`.
- `shouldStopDiagnostic(session): boolean`.

- [ ] **Step 1: Write failing deterministic-routing tests**

Test these exact behaviors:

1. First 36 items cover every CEFR with three receptive and three contextual items.
2. Items 37–45 are drawn from the provisional boundary level and its immediate neighbors.
3. No item repeats.
4. Same seed and same answers produce the same item order.
5. A run never stops before 45 or continues after 60.
6. `unknown` is stored as `correct: false, responseKind: "unknown"`.
7. Session JSON can be stringified and resumed without changing the next item.

```js
test("covers every level before adaptive concentration", () => {
  const sampleCount = (current, cefr, dimension) => current.responses.filter((response) => response.cefr === cefr && response.dimension === dimension).length;
  let session = createDiagnosticSession({ items, contentVersion: "1.0.0-phase1", seed: "fixed-seed" });
  while (session.responses.length < 36) {
    const item = nextDiagnosticItem(session, items);
    session = recordDiagnosticAnswer(session, { itemId: item.id, optionId: item.correctOptionId });
  }
  for (const cefr of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
    assert.equal(sampleCount(session, cefr, "receptive"), 3);
    assert.equal(sampleCount(session, cefr, "contextual"), 3);
  }
});
```

- [ ] **Step 2: Run and verify missing engine failure**

Run: `pnpm test -- tests/unit/diagnostic-engine.test.mjs`

Expected: FAIL with missing engine module.

- [ ] **Step 3: Implement the transparent two-stage rule**

Use ordered levels `A1..C2`. The coverage stage deterministically shuffles each `(level, dimension)` pool by `seed + level + dimension` and selects three items from each pool, interleaving levels and dimensions rather than presenting all A1 items together.

After 36 responses:

```js
function provisionalBoundary(responses) {
  const levelRates = rateByLevel(responses);
  let boundary = 0;
  for (let index = 0; index < LEVELS.length; index += 1) {
    const current = levelRates[LEVELS[index]];
    const lowerPassed = LEVELS.slice(0, index).every((level) => levelRates[level] >= 0.5);
    if (current >= 2 / 3 && lowerPassed) boundary = index;
  }
  return boundary;
}
```

Adaptive selection cycles contextual and receptive items from boundary −1, boundary, boundary +1, clamped to A1–C2. At response 45, stop if the three active-band rates are each outside the ambiguity interval `[0.4, 0.6]`; otherwise append blocks of three and re-evaluate until response 60. If an active pool is exhausted, select the nearest unsampled level in the same dimension.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test -- tests/unit/diagnostic-engine.test.mjs`

Expected: all deterministic, coverage, boundary, unknown, resume, and stop tests pass.

```bash
git add src/diagnostic/engine.mjs tests/unit/diagnostic-engine.test.mjs
git commit -m "feat: add transparent adaptive diagnostic routing"
```

---

### Task 8: Three-Result Scoring and Confidence Ranges

**Files:**
- Create: `src/diagnostic/scoring.mjs`
- Create: `tests/unit/diagnostic-scoring.test.mjs`

**Interfaces:**
- `scoreDiagnostic({responses, items, referenceBands}): DiagnosticReport`.
- Report fields: `receptiveEstimate`, `contextualScore`, `effectiveEstimate`, `suggestedCefr`, `confidence`, `bandBreakdown`, `referenceVersion`, `disclaimerIt`, `disclaimerZh`.

- [ ] **Step 1: Write failing formula tests**

Build a fixture with exactly three receptive and three contextual responses at every level. Assert:

- `pRec = (correctRec + 1) / (answeredRec + 2)`.
- `pCtx = (correctCtx + 1) / (answeredCtx + 2)`.
- receptive point estimate is `sum(targetNodeCount * pRec)`.
- contextual score is `100 * weightedMean(pCtx, targetNodeCount)`.
- effective point estimate is `sum(targetNodeCount * sqrt(pRec * pCtx))`.
- all-zero raw answers still produce a nonzero smoothed estimate but confidence is `low`.
- all-correct raw answers remain below the mathematical maximum because of smoothing and are rounded to a range, not shown as exact truth.
- a level with fewer than three responses in either dimension is marked `insufficient` and excluded.

- [ ] **Step 2: Run and verify missing scorer failure**

Run: `pnpm test -- tests/unit/diagnostic-scoring.test.mjs`

Expected: FAIL with missing scoring module.

- [ ] **Step 3: Implement Wilson 80% ranges and level recommendation**

Use z = `1.2815515655446004`. Implement:

```js
export function wilsonInterval(successes, total, z = 1.2815515655446004) {
  if (!total) return { low: 0, high: 1 };
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total) / denominator;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}
```

Propagate low/high band proportions through the same receptive and geometric-mean formulas, round displayed word ranges to the nearest 5, and clamp to 0–600.

Suggested CEFR is the highest level with combined raw rate at least `2/3` while every lower level is at least `1/2`. Confidence is `high` when the effective interval width is at most 90 words, `medium` at most 150, otherwise `low`.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test -- tests/unit/diagnostic-scoring.test.mjs`

Expected: exact fixture calculations and boundary cases pass.

```bash
git add src/diagnostic/scoring.mjs tests/unit/diagnostic-scoring.test.mjs
git commit -m "feat: score diagnostic results transparently"
```

---

### Task 9: Diagnostic UI, Resume, Report, and Settings Handoff

**Files:**
- Create: `src/ui/diagnostic-view.mjs`
- Modify: `src/app.mjs`
- Modify: `src/ui/shell.mjs`
- Modify: `styles.css`
- Create: `tests/e2e/diagnostic.spec.mjs`

**Interfaces:**
- `mountDiagnosticView(container, {items, referenceBands, repository, contentVersion, onAcceptLevel})`.
- Saves active session as `diagnostic-active`; saves completed reports with immutable IDs.

- [ ] **Step 1: Write the failing end-to-end diagnostic test**

The test must:

1. Click `Testa il tuo vocabolario`.
2. Confirm Italian-only prompt/options and visible `Non lo so`.
3. Answer ten items, reload, and confirm item 11 resumes.
4. Complete a deterministic mocked 45-item path.
5. Confirm three result cards, the 600-word reference label, confidence, and non-certification disclaimer.
6. Confirm Chinese explanation appears only after completion.
7. Click `Usa il livello consigliato` and verify Settings reflects the suggested CEFR.

- [ ] **Step 2: Run and verify UI failure**

Run: `pnpm test:e2e -- tests/e2e/diagnostic.spec.mjs --project=mobile-375`

Expected: FAIL because the diagnostic view is not mounted.

- [ ] **Step 3: Implement the test flow**

Do not show correctness between questions. Each screen contains level-neutral progress text such as `Domanda 12 · il test termina tra 45 e 60 domande`, one prompt, four stored options, `Non lo so`, and a quit/save action.

On completion, render exactly:

- `Vocabolario ricettivo`: rounded word range.
- `Uso nel contesto`: integer percentage plus semantic/collocation/form breakdown.
- `Vocabolario effettivo`: rounded word range, suggested CEFR, confidence.

The report footer includes both disclaimers from the scorer. A collapsible review list may show Italian and Chinese explanations only after the report exists.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test && pnpm test:e2e -- tests/e2e/diagnostic.spec.mjs`.

Expected: diagnostic passes on 375, 768, and 1440 without console or network errors.

```bash
git add src/ui/diagnostic-view.mjs src/app.mjs src/ui/shell.mjs styles.css tests/e2e/diagnostic.spec.mjs
git commit -m "feat: add resumable vocabulary diagnostic"
```

---

### Task 10: 20-Word Training Queue and Mastery State

**Files:**
- Create: `src/training/queue.mjs`
- Create: `src/training/questions.mjs`
- Create: `src/training/mastery.mjs`
- Create: `src/ui/training-view.mjs`
- Modify: `src/app.mjs`
- Create: `tests/unit/training-queue.test.mjs`
- Create: `tests/unit/mastery.test.mjs`
- Create: `tests/e2e/training.spec.mjs`

**Interfaces:**
- `buildDailyQueue({lexemes, progress, settings, now}): string[]` returns at most `dailyGoal`, default 20.
- `buildQuestion({lexeme, type, seed}): TrainingQuestion`.
- `updateMastery(progress, attempt): WordProgress`.
- `mountTrainingView(container, dependencies)` renders landing, active question, feedback, and summary.

- [ ] **Step 1: Write failing queue and mastery tests**

Queue priority fixture must order: wrong/due → reading weakness → learned without contextual pass → unseen at target CEFR → optional stretch. Assert disabled question types never appear.

Mastery fixture must prove that three correct multiple-choice answers on one date do not master a word, while correct responses on two dates across two types including contextual or typed input do.

- [ ] **Step 2: Run and verify missing modules**

Run: `pnpm test -- tests/unit/training-queue.test.mjs tests/unit/mastery.test.mjs`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement pure queue and mastery logic**

Use statuses `unseen`, `learning`, `review`, `weak`, `mastered`. A wrong answer sets `weak` and schedules the same word after at least four intervening questions with a different prompt/example. A correct answer never erases the stored mistake event.

Question types are `meaning`, `lookalike`, `context`, `grammar`, `sense`, `phrase`, `paraphrase`. If a lexeme lacks valid material for an enabled type, choose another enabled compatible type; if none exists, return a typed `NO_COMPATIBLE_QUESTION` error for the UI.

- [ ] **Step 4: Implement the training UI**

The landing primary button starts without a mode picker. Feedback shows Italian explanation, optional Chinese explanation, three examples, phrases, morphology, and linked word buttons. The same screen ends with `Rivedi gli errori` and `Torna all'inizio`; it does not automatically loop forever.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test && pnpm test:e2e -- tests/e2e/training.spec.mjs`.

Expected: 20-word queue, wrong-answer reappearance, settings-only type selection, and persistence pass.

```bash
git add src/training src/ui/training-view.mjs src/app.mjs tests/unit/training-queue.test.mjs tests/unit/mastery.test.mjs tests/e2e/training.spec.mjs
git commit -m "feat: add the contextual 20-word training loop"
```

---

### Task 11: Learned Words, Mistakes, Phrases, and Linked Navigation

**Files:**
- Create: `src/ui/lexicon-view.mjs`
- Modify: `src/app.mjs`
- Modify: `styles.css`
- Create: `tests/e2e/lexicon.spec.mjs`

**Interfaces:**
- `mountLexiconView(container, {lexemes, repository, navigateToLexeme})`.
- Internal lexeme navigation keeps a stack of lexeme IDs and exposes `back()`.

- [ ] **Step 1: Write the failing lexicon navigation test**

The test seeds one learned word and one mistake, opens Lessico, verifies the three tabs `Parole studiate`, `Errori`, and `Espressioni`, searches `tenere`, opens a related node, returns to `tenere`, and confirms the mistake preserves original prompt, chosen answer, correct answer, rationale, and timestamp.

- [ ] **Step 2: Run and verify missing view failure**

Run: `pnpm test:e2e -- tests/e2e/lexicon.spec.mjs --project=mobile-375`

Expected: FAIL because the lexicon view is empty.

- [ ] **Step 3: Implement filters and linked details**

Filters: text search, CEFR, part of speech, status, and topic. Lexeme detail order: lemma/register → Italian senses → structures/collocations → phrases → examples → morphology/family → synonyms/antonyms/lookalikes/confusables. Chinese remains in expandable post-learning help, not the primary definition.

Only render links for IDs that exist in the loaded lexicon. Build failure, not runtime hiding, remains the defense against broken public content.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test:e2e -- tests/e2e/lexicon.spec.mjs`.

Expected: all tabs, filters, cross-links, back stack, and error snapshots pass at all viewports.

```bash
git add src/ui/lexicon-view.mjs src/app.mjs styles.css tests/e2e/lexicon.spec.mjs
git commit -m "feat: add linked lexicon and mistake review"
```

---

### Task 12: Convert D01 into a Rights-Tracked Reading Comprehension

**Files:**
- Create: `data/readings/manifest.json`
- Create: `data/readings/b2.json`
- Create: `src/reading/matcher.mjs`
- Create: `src/reading/scoring.mjs`
- Create: `src/ui/reading-view.mjs`
- Modify: `data/sources.json`
- Modify: `src/app.mjs`
- Create: `tests/unit/reading.test.mjs`
- Create: `tests/e2e/reading.spec.mjs`
- Modify: `data/manifest.json`

**Interfaces:**
- `rankReadings({readings, progress, targetCefr, allowStretchWords}): ReadingMatch[]`.
- `scoreReading(reading, answers): {correct, total, results, weakWordIds}`.
- `mountReadingView(container, dependencies)`.

- [ ] **Step 1: Write failing matching and no-glossary tests**

Unit test computes known coverage as `known targetWordIds / targetWordIds.length`, boosts weak/due word overlap, and never reports 100% personalization when the threshold is unmet. An eligible recommended reading targets 80%–90% known words; if none qualifies, return the closest article with its real percentage. When stretch words are enabled, at most 10% of targets may be one CEFR level above the user's target, and no item more than one level above is eligible.

Playwright test asserts before submit:

```js
await expect(page.locator("[data-definition], .translation-zh, .glossary")).toHaveCount(0);
await expect(page.getByText(/adozione/i)).toBeVisible();
```

After submit it asserts evidence paragraph, paraphrase, rationale, and linked word buttons appear.

- [ ] **Step 2: Run and verify failures**

Run: `pnpm test -- tests/unit/reading.test.mjs` and `pnpm test:e2e -- tests/e2e/reading.spec.mjs --project=mobile-375`.

Expected: missing reading modules/data.

- [ ] **Step 3: Convert the existing article without inline definitions**

Use the current D01 body as the editorial base. Verify factual source links and store the article as `rights.status: "original"` with Istat and Politecnico di Milano source references. Add exactly seven questions covering:

1. main idea,
2. detail paraphrase,
3. phrase in context,
4. pronoun/reference,
5. inference,
6. author stance/logical relationship,
7. `Vero / Falso / Non indicato`.

Every question must include evidence paragraph number and a short evidence excerpt used only after submission. Do not highlight target words in the article before submit.

Finalize the root manifest as `contentVersion: "1.0.0-phase1"`, `stage: "diagnostic-release"`, and counts `50/120/1`.

- [ ] **Step 4: Implement matching, scoring, and UI**

Reading cards show CEFR, topic, word count, time, and actual coverage. `link-only` cards open the source in a new tab and keep local answer state. Save answer/result snapshots in `readingProgress` and pass incorrect linked words back to the training queue as reading weaknesses. This phase has one B2 reading, so filters with no result must say the phase-one library is limited rather than fabricate content.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test && pnpm test:content && pnpm test:e2e -- tests/e2e/reading.spec.mjs`.

Expected: one schema-valid, rights-valid reading with seven answerable questions; no pre-submit definitions.

```bash
git add data/manifest.json data/readings data/sources.json src/reading src/ui/reading-view.mjs src/app.mjs tests/unit/reading.test.mjs tests/e2e/reading.spec.mjs
git commit -m "feat: turn D01 into evidence-based reading practice"
```

---

### Task 13: Content Loader, Offline Update Safety, and Honest Failure States

**Files:**
- Create: `src/core/content-loader.mjs`
- Modify: `src/app.mjs`
- Modify: `sw.js`
- Modify: `manifest.webmanifest`
- Create: `tests/unit/content-loader.test.mjs`
- Create: `tests/e2e/offline.spec.mjs`

**Interfaces:**
- `loadContent({fetchImpl, baseUrl}): Promise<{manifest, lexemes, diagnosticItems, referenceBands, readings}>`.
- Typed errors: `CONTENT_HTTP_ERROR`, `CONTENT_VERSION_ERROR`, `CONTENT_INTEGRITY_ERROR`.

- [ ] **Step 1: Write failing loader and offline tests**

Mock one failed level file and assert the loader reports the exact path/status and does not return a partial mixed-version library. E2E first visits online, starts a training session, switches offline, reloads, resumes, then restores network.

- [ ] **Step 2: Run and verify failures**

Run: `pnpm test -- tests/unit/content-loader.test.mjs` and `pnpm test:e2e -- tests/e2e/offline.spec.mjs --project=mobile-375`.

Expected: missing loader and old Service Worker behavior fail.

- [ ] **Step 3: Implement atomic version loading**

Load root manifest first, then every referenced file. Reject any child manifest with a different `contentVersion`. Build maps only after all JSON resolves and relationship checks have passed; never expose half-loaded content.

- [ ] **Step 4: Version and update the Service Worker**

Set cache name from the content version, precache shell plus all manifest files, use cache-first for immutable versioned JSON and stale-while-revalidate for shell files. Do not call `skipWaiting()` automatically when a client has an active training or diagnostic session; notify the app with `UPDATE_READY`, then activate after the session ends or the user confirms refresh.

Update the manifest shortcuts to Training and Reading only. Keep `display: "standalone"` and scope `./`.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test && pnpm test:e2e -- tests/e2e/offline.spec.mjs`.

Expected: cached session resumes offline; update never interrupts an active session.

```bash
git add src/core/content-loader.mjs src/app.mjs sw.js manifest.webmanifest tests/unit/content-loader.test.mjs tests/e2e/offline.spec.mjs
git commit -m "feat: make content loading and offline updates resilient"
```

---

### Task 14: Remove Retired Assets Only After Parity

**Files:**
- Delete: `training-engine.mjs`
- Delete: `data/learning-data.json`
- Delete: `data/resources.json`
- Delete: `data/vocabulary-training.json`
- Modify: `README.md`
- Modify: `tests/content/content-contract.test.mjs`
- Create: `tests/unit/no-retired-features.test.mjs`

**Interfaces:**
- Repository has no runtime reference to the four retired files.
- README truthfully labels the deployment `Phase 1 diagnostic release` and links the approved spec.

- [ ] **Step 1: Write the failing retired-feature test**

Scan all public HTML, JS, manifest, and Service Worker files. Fail if runtime text references `resources.json`, `learning-data.json`, `vocabulary-training.json`, `training-engine.mjs`, `data-view="resources"`, `data-view="subtitles"`, or `data-view="progress"`.

- [ ] **Step 2: Run and confirm old files/references are detected**

Run: `pnpm test -- tests/unit/no-retired-features.test.mjs`

Expected: FAIL until all imports and cache entries have migrated.

- [ ] **Step 3: Remove the tracked legacy files**

Use `git rm` only after Tasks 5, 10, and 12 prove content and feature parity. Because the files remain recoverable in Git history, no separate backup copy is created.

README must state:

- this release has 50 pilot lexemes, a 120-item diagnostic bank, and one reading;
- the planned 600/18 library follows after the learner completes the diagnostic;
- all progress stays on the current device;
- copyright statuses and build gate;
- exact local commands;
- live URL and spec link.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test && pnpm test:content`.

Expected: no retired feature/file reference; content summary is `50/120/1`.

```bash
git rm training-engine.mjs data/learning-data.json data/resources.json data/vocabulary-training.json
git add README.md tests/content/content-contract.test.mjs tests/unit/no-retired-features.test.mjs
git commit -m "refactor: retire the previous multi-tool demo"
```

---

### Task 15: CI, Three-Viewport QA, Deployment, and Diagnostic Checkpoint

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Create: `tests/e2e/app.spec.mjs`
- Create locally, do not commit: `test-results/qa-summary.json`
- Update outside public repo: `D:/Codex Workspace/10_Projects/Project_009_意大利语职场强化/00_项目控制台.md`
- Create outside public repo: `D:/Codex Workspace/10_Projects/Project_009_意大利语职场强化/90_过程记录/2026-09-19_词汇阅读重构_Phase1_QA_v01.md`

**Interfaces:**
- Pull/push verification blocks deployment on unit, content, rights, migration, or browser failure.
- Public URLs remain `https://chenpihuamei.github.io/italiano-flow/` and the root redirect.

- [ ] **Step 1: Write the final failing acceptance test**

At all three configured viewports, assert:

- HTTP 200 and title `Italiano Flow`.
- exactly four primary navigation buttons.
- no horizontal overflow.
- no unnamed buttons.
- visible keyboard focus.
- no console errors or responses ≥400.
- primary training action works.
- diagnostic starts and resumes.
- Settings is the only location with question-type controls.
- linked lexeme navigation works.
- reading hides definitions before submit and reveals evidence after submit.
- Service Worker registers.

- [ ] **Step 2: Run full verification and capture the expected first failure**

Run: `pnpm verify`.

Expected: any remaining integration gap fails before workflow changes are accepted.

- [ ] **Step 3: Gate Pages deployment on verification**

Update the workflow to:

1. checkout,
2. set up pnpm 11.19.0,
3. set up Node 24 with pnpm cache,
4. `pnpm install --frozen-lockfile`,
5. install Playwright Chromium with dependencies,
6. `pnpm verify`,
7. configure/upload/deploy Pages only if verification passes.

Use one `verify-and-deploy` job so a failed test cannot publish.

- [ ] **Step 4: Run local completion checks**

```powershell
$nodeRuntime = 'C:\Users\Ludovico Chen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$pnpmCli = 'C:\Users\Ludovico Chen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs'
& $nodeRuntime $pnpmCli verify
git diff --check
git status --short
```

Expected: all unit/content/e2e tests pass; no whitespace errors; only intended files changed.

- [ ] **Step 5: Request code review before integration**

Invoke `superpowers:requesting-code-review`. Resolve every correctness, privacy, data-loss, rights, and accessibility finding before integration. Record accepted findings and proof in the Project_009 QA document.

- [ ] **Step 6: Finish the branch and publish**

Invoke `superpowers:finishing-a-development-branch`. After user-approved integration, push `main`, wait for GitHub Actions, and verify these four entry routes:

```text
https://chenpihuamei.github.io/
https://chenpihuamei.github.io/italiano-flow
https://chenpihuamei.github.io/italiano-flow/
https://chenpihuamei.github.io/italiano-flow/index.html
```

Verify GitHub Actions conclusion `success`, final URL, title, four-view navigation, no console/network errors, and a fresh-device diagnostic start.

- [ ] **Step 7: Commit documentation and stop at the learner checkpoint**

```bash
git add .github/workflows/deploy-pages.yml tests/e2e/app.spec.mjs README.md
git commit -m "ci: verify the diagnostic release before Pages deploy"
```

Ask the user to complete the diagnostic on the live site and export/share only the generated report fields: receptive range, contextual score, effective range, suggested CEFR, confidence, and band breakdown. Do not ask for the full local database. Use that report to create the second implementation plan for the personalized 600-word/18-reading library.

---

## Plan Self-Review Checklist

- Spec coverage in this phase: four-view IA, settings-only modes, IndexedDB migration, 120-item/45–60 diagnostic, three results, 50 complete pilot nodes, linked lexicon, mistakes, one no-glossary reading, rights gate, offline behavior, three viewports, and Pages verification.
- Intentionally deferred behind the real diagnostic: remaining 550 lexemes, remaining 17 readings, final topic allocation, the user-local article import UI, and launch-level 600/18 content audit.
- The plan contains no server account, cloud sync, hidden telemetry, AI generation, DRM extraction, or unlicensed full-text path.
- IDs and function names are consistent across tasks.
- Old localStorage keys remain recoverable after migration.
- Public content counts remain truthful at every milestone.
