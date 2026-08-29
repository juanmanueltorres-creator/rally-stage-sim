# Chile 2026 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a minimal, testable Rally Chile 2026 frontend foundation with typed data, a Biobío map shell and deterministic stage progress logic.

**Architecture:** Static sourced event data is loaded by the frontend. Domain contracts are independent from presentation. Simulation math is pure and tested before map animation is added.

**Tech Stack:** React 19, TypeScript, Vite, MapLibre GL, Turf.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-29-chile-2026-foundation-design.md`

## Global Constraints

- No backend, Supabase, PostGIS or authentication in V0.
- No browser-side dependency on unofficial WRC APIs.
- No route geometry is drawn until a trustworthy LineString is verified.
- Planned, simulated and observed values must be explicitly distinguishable.
- No credentials or API keys in the repository.

---

### Task 1: Scaffold and pure simulation contract

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/simulation/progress.test.ts`
- Create: `src/simulation/progress.ts`

**Interfaces:**
- Produces: `stageProgress(elapsedSeconds: number, expectedDurationSeconds: number): number`

- [ ] **Step 1: Write the failing test** covering midpoint progress, lower/upper clamping and invalid duration.
- [ ] **Step 2: Run `node --experimental-strip-types --test src/simulation/progress.test.ts` and confirm failure because the module is missing.**
- [ ] **Step 3: Implement `stageProgress` with finite-number validation and 0..1 clamping.**
- [ ] **Step 4: Run the same test and confirm all cases pass.**
- [ ] **Step 5: Commit the scaffold and simulation contract.**

### Task 2: Typed Rally Chile dataset

**Files:**
- Create: `src/domain/rally.ts`
- Create: `public/data/chile-2026/event.json`
- Create: `public/data/chile-2026/stages.json`

**Interfaces:**
- Produces: `RallyEvent`, `RallyStage`, `DataProvenance`, and `StageGeometryStatus`.
- `RallyStage.geometry` remains `null` while `geometryStatus` is `pending-verification`.

- [ ] **Step 1: Define the domain types with explicit provenance and data-state fields.**
- [ ] **Step 2: Add the sourced Chile 2026 event record.**
- [ ] **Step 3: Add SS1 Turquía with 22.94 km, 2026-09-11T08:53:00-03:00, gravel surface and no geometry.**
- [ ] **Step 4: Validate both JSON files parse successfully.**
- [ ] **Step 5: Commit the typed dataset.**

### Task 3: Regional map shell and provenance-first UI

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/components/RallyMap.tsx`
- Create: `src/styles.css`

**Interfaces:**
- Consumes: Chile event/stage JSON.
- `RallyMap` receives no fabricated stage geometry and shows a pending-verification state.

- [ ] **Step 1: Build the React shell with event title, date and SS1 metadata.**
- [ ] **Step 2: Initialize MapLibre on a free OpenStreetMap raster source with attribution and a regional Biobío center.**
- [ ] **Step 3: Show a visible `Route geometry pending verification` state instead of a line.**
- [ ] **Step 4: Add source links and the unofficial-project disclaimer.**
- [ ] **Step 5: Run `npm test` and `npm run build`; both must pass before merge.**
