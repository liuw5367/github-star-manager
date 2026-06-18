# Repo Sync And UI Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make repo metadata persistence reliable across refresh/sync, make trash and empty states behave correctly, and leave the project with working regression tests plus a clean lint/build surface.

**Architecture:** Introduce a small persistence layer that owns Gist/cache serialization so store logic stops open-coding file maps. Keep store APIs focused on state transitions, then wire the UI to richer derived state for trash, empty states, and invalid selection cleanup. Use Node's built-in `node:test` runner for regression coverage without adding external test dependencies.

**Tech Stack:** React 19, Zustand, TypeScript, Rsbuild, Node 24 `node:test`

---

## Task 1: Establish test harness and persistence seams

**Files:**
- Create: `tests/repo-persistence.test.mjs`
- Create: `src/lib/repoPersistence.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Write the failing persistence tests**

Create `tests/repo-persistence.test.mjs` with assertions for:
- merging cached repos + `tags.json` + `notes.json` + `trash.json`
- serializing repos/categories/trash back to Gist file payloads
- preserving language tags while replacing user tags from remote data

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/repo-persistence.test.mjs`
Expected: FAIL because `src/lib/repoPersistence.ts` does not exist yet.

- [ ] **Step 3: Write minimal persistence implementation**

Add `src/lib/repoPersistence.ts` with:
- typed helpers to parse Gist JSON safely
- `mergeRemoteRepoData(...)`
- `buildGistPayload(...)`
- `buildTrashRepos(...)` / `buildActiveRepos(...)` style helpers if needed

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/repo-persistence.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/repo-persistence.test.mjs src/lib/repoPersistence.ts package.json tsconfig.json
git commit -m "test add persistence helpers coverage"
```

## Task 2: Close Phase 1 data consistency gaps

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/stores/repoStore.ts`
- Modify: `src/api/gist.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write the failing store/bootstrap tests**

Extend `tests/repo-persistence.test.mjs` or add a focused `tests/repo-store-sync.test.mjs` covering:
- startup loads `trash.json`
- note/tag edits serialize immediately to Gist
- sync merges remote/local/tag/category state deterministically

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/repo-persistence.test.mjs tests/repo-store-sync.test.mjs`
Expected: FAIL because immediate persistence and trash hydration are missing.

- [ ] **Step 3: Implement the minimal fixes**

Update app/store code to:
- hydrate active repos plus trash repos from Gist on startup
- persist note/tag/category edits immediately
- route all Gist payload generation through the new persistence helper
- keep a single merge strategy for cache/Gist/GitHub sync

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/repo-persistence.test.mjs tests/repo-store-sync.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/stores/repoStore.ts src/api/gist.ts src/types/index.ts tests/repo-persistence.test.mjs tests/repo-store-sync.test.mjs
git commit -m "fix persist repo metadata and trash state"
```

## Task 3: Implement Phase 2 UI behavior fixes

**Files:**
- Modify: `src/components/repo-list/RepoList.tsx`
- Modify: `src/components/repo-list/RepoToolbar.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/sidebar/CategoryNav.tsx`
- Modify: `src/stores/uiStore.ts`

- [ ] **Step 1: Write the failing derived-state tests**

Add `tests/repo-list-derivations.test.mjs` for:
- trash filter returning trash repos
- empty-state reason selection
- selected repo clearing when repo disappears from active/trash list

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/repo-list-derivations.test.mjs`
Expected: FAIL because the current list logic hard-codes `trash` to empty and lacks empty-state derivation.

- [ ] **Step 3: Write minimal implementation**

Implement:
- derived helper(s) for filtered repos and empty-state reason
- toolbar sync feedback including `lastSynced`
- selection cleanup when current repo no longer exists in the visible data source
- distinct empty states for no data / no search results / empty trash

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/repo-list-derivations.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/repo-list/RepoList.tsx src/components/repo-list/RepoToolbar.tsx src/components/layout/AppShell.tsx src/components/sidebar/CategoryNav.tsx src/stores/uiStore.ts tests/repo-list-derivations.test.mjs
git commit -m "fix repo list trash and empty state behavior"
```

## Task 4: Finish Phase 3 engineering cleanup and lint

**Files:**
- Modify: `src/api/github.ts`
- Modify: `src/components/readme/ReadmePanel.tsx`
- Modify: `src/components/sidebar/CategoryNav.tsx`
- Modify: `src/lib/autoClassify.ts`
- Modify: `src/lib/utils.ts`
- Modify: `src/stores/repoStore.ts`
- Modify: `src/stores/tagStore.ts`
- Modify: `package.json`

- [ ] **Step 1: Add any remaining failing regression tests**

Add tests for edge cases discovered during implementation, especially:
- repeated tag toggles and note updates
- sync removing selected repos
- serialization of empty maps

- [ ] **Step 2: Run test/lint to verify current failures**

Run:
- `node --test tests/*.test.mjs`
- `pnpm lint`

Expected: tests may pass but lint should still fail on known repo-wide issues.

- [ ] **Step 3: Fix the remaining issues**

Clean up:
- regex/lint issue in `src/api/github.ts`
- multiline/import/newline errors in sidebar/store/lib files
- timeout cleanup warning in `ReadmePanel.tsx`
- any minor structural cleanup needed to keep new code readable

- [ ] **Step 4: Run full verification**

Run:
- `node --test tests/*.test.mjs`
- `pnpm lint`
- `pnpm build`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/api/github.ts src/components/readme/ReadmePanel.tsx src/components/sidebar/CategoryNav.tsx src/lib/autoClassify.ts src/lib/utils.ts src/stores/repoStore.ts src/stores/tagStore.ts package.json tests
git commit -m "refactor stabilize repo sync and lint surface"
```
