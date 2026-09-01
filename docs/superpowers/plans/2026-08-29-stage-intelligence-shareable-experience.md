# Shareable Stage Intelligence Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the app around a first-visit editorial intro, a Rally Chile 2026 stage overview, and a shareable SS1 Turquía stage-intelligence page with weather/context/access information while preserving simulation as a secondary tool.

**Architecture:** Keep the application static and dependency-light. Add pure hash-routing, weather-summary, share-link and spectator-normalization helpers; keep official/sourced event metadata in versioned JSON; let `RallyMap` expose its existing Open-Meteo snapshots upward so the stage page can derive a compact summary without a second weather request. React composes overview/stage views while simulation remains inside the stage page.

**Tech Stack:** React 19, TypeScript, Vite, MapLibre GL, Turf, Node built-in test runner, static JSON, Open-Meteo.

**Spec:** `docs/superpowers/specs/2026-08-29-stage-intelligence-shareable-experience-design.md`

## Global Constraints

- Work on `feat/chile-2026-foundation`; do not merge PR #1.
- `planned` ≠ `simulated` ≠ `observed`.
- `reconstructed` geometry ≠ `verified` geometry.
- Open-Meteo is modelled context, not station observation.
- Unknown access/parking/closure data stays visibly pending.
- No React Router/backend/auth/new paid dependency for this increment.
- Direct stage links use `/#/chile-2026/ss1-turquia` in v1.
- Existing route, environmental and simulation behavior must remain usable when weather is unavailable.
- Safety/access instructions must come from sourced official/organizer material; community reports only inform product design.

---

### Task 1: Hash Route and Share Contract

**Files:**
- Create: `src/navigation/stageRoute.test.ts`
- Create: `src/navigation/stageRoute.ts`

**Interfaces:**
- Produces: `parseAppRoute(hash: string): AppRoute`
- Produces: `stageHash(eventId: string, slug: string): string`
- Produces: `stageShareUrl(origin: string, pathname: string, eventId: string, slug: string): string`

- [ ] **Step 1: Write failing tests** for empty hash → overview, SS1 hash → stage route, unknown hash → overview with notice, and canonical share URL generation.
- [ ] **Step 2: Run `npm test` in CI and verify RED** because `stageRoute.ts` does not exist.
- [ ] **Step 3: Implement the minimal parser/link functions** with a typed `AppRoute` union and no browser dependency.
- [ ] **Step 4: Run `npm test` and verify GREEN.**

### Task 2: Weather Summary Derivation

**Files:**
- Create: `src/map/weatherSummary.test.ts`
- Create: `src/map/weatherSummary.ts`

**Interfaces:**
- Consumes: `RouteEnvironmentSnapshot[]` from `src/map/openMeteo.ts`.
- Produces: `summarizeRouteWeather(snapshots: RouteEnvironmentSnapshot[]): StageWeatherSummary`.

`StageWeatherSummary` fields:
- `temperatureMinC: number | null`
- `temperatureMaxC: number | null`
- `maxGustKmh: number | null`
- `maxPrecipitationMm: number | null`
- `elevationMinM: number | null`
- `elevationMaxM: number | null`
- `validAt: string | null`

- [ ] **Step 1: Write failing tests** using multiple nodes, null values, and an empty snapshot array.
- [ ] **Step 2: Run `npm test` and verify RED** because the summary helper does not exist.
- [ ] **Step 3: Implement null-safe min/max aggregation** with no weather inference beyond numeric aggregation.
- [ ] **Step 4: Run `npm test` and verify GREEN.**

### Task 3: Spectator Data Contract and Pending State

**Files:**
- Modify: `src/domain/rally.ts`
- Create: `src/domain/spectator.test.ts`
- Create: `src/domain/spectator.ts`
- Create: `public/data/chile-2026/spectator.json`

**Interfaces:**
- Produces domain types `StageSpectatorInfo`, `SpectatorPoint`, `SpectatorService`.
- Produces `normalizeSpectatorInfo(info: StageSpectatorInfo | undefined, stageId: string): StageSpectatorInfo`.

- [ ] **Step 1: Write failing test** requiring missing spectator data to normalize to `accessStatus: 'pending'`, empty zones/parking/services and no invented closure text.
- [ ] **Step 2: Run `npm test` and verify RED.**
- [ ] **Step 3: Add minimal types/helper and a sourced SS1 static record.** The record may include the organizer’s general public-access warning, but individual parking/zones/closure specifics stay pending until stage-specific official information is published.
- [ ] **Step 4: Run `npm test` and verify GREEN.**

### Task 4: Full Rally Schedule Snapshot

**Files:**
- Modify: `public/data/chile-2026/stages.json`

**Interfaces:**
- Preserve the existing SS1 reconstructed geometry and provenance.
- Add SS2–SS16 as planned stage metadata with `geometryStatus: 'pending-verification'`, `geometry: null`, and per-stage provenance.

- [ ] **Step 1: Add all 16 schedule rows** grouped by date using the currently published schedule snapshot; repeated stages share names but have unique ids/codes/start times.
- [ ] **Step 2: Keep disputed public distances explicit in provenance notes** where current WRC and published schedule values differ; never silently mix route geometry with another length claim.
- [ ] **Step 3: Confirm JSON remains parseable via the application build/CI.**

### Task 5: Map Environment Callback and Secondary Simulation

**Files:**
- Modify: `src/components/RallyMap.tsx`

**Interfaces:**
- Add optional prop `onEnvironmentChange?: (snapshots: RouteEnvironmentSnapshot[], status: EnvironmentStatus) => void`.
- Add prop `simulationEnabled?: boolean` defaulting to `true` for compatibility.

- [ ] **Step 1: Refactor only after Tasks 1–3 are green.**
- [ ] **Step 2: Notify the parent whenever environment state changes** so stage-level summary is derived from the same request.
- [ ] **Step 3: When simulation is disabled, render route/environment without creating animated fleet layers or requestAnimationFrame.**
- [ ] **Step 4: Preserve weather fallback and map geometry behavior.**

### Task 6: Intro, Rally Overview and Stage Page

**Files:**
- Create: `src/components/IntroOverlay.tsx`
- Create: `src/components/RallyOverview.tsx`
- Create: `src/components/StageDetail.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `IntroOverlay` emits `onEnter()` and can be reopened from `WHY THIS EXISTS`.
- `RallyOverview` consumes event + all stages and navigates through generated hashes.
- `StageDetail` consumes selected stage, optional run, entries, spectator info and derives weather summary from map callback.

- [ ] **Step 1: Load event, all stages, simulations, entries and spectator JSON once in `App`.**
- [ ] **Step 2: Parse `window.location.hash`, subscribe to `hashchange`, and render overview or stage detail.**
- [ ] **Step 3: Add first-visit intro using `localStorage['rally-stage-intelligence:intro-seen']`.** Failure to access localStorage must not block the app.
- [ ] **Step 4: Overview groups stages by Friday/Saturday/Sunday and shows concise distance/time/readiness cards.** Only stages with geometry show `VIEW STAGE`; pending stages show `CONTEXT PENDING` while remaining visible.
- [ ] **Step 5: SS1 stage page shows header, weather strip, map/environment nodes, stage-conditions interpretation, spectator/access/safety panel, provenance and `SHARE STAGE`.**
- [ ] **Step 6: Share uses `navigator.share` when available and clipboard fallback; UI reports copied/shared state without throwing when either API is unavailable.**
- [ ] **Step 7: Put the existing start grid, roster and animated fleet behind a `SIMULATE STAGE` disclosure/button below stage intelligence.**

### Task 7: Visual System Refresh

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- No new runtime dependency.

- [ ] **Step 1: Shift base background to dark blue-charcoal and panels to near-black.**
- [ ] **Step 2: Add editorial serif stack for hero/stage names and preserve sans stack for technical UI.**
- [ ] **Step 3: Use amber/copper for CTA/high-level state, cyan/blue for weather/interactive nodes, and limited red/green for semantic states only.**
- [ ] **Step 4: Make intro, rally cards, stage summary and spectator panel responsive down to 320px.**
- [ ] **Step 5: Preserve high contrast and textual cues so color is never the only status carrier.**

### Task 8: Vault Territorial Problems

**Files:**
- Create in `juanmanueltorres-creator/geoplatform-knowledge-base`: `03 - Dolores/Contexto de tramo clima y accesos dispersos.md`
- Update existing related pain notes only where cross-linking adds value.

**Interfaces:**
- Follow the existing vault structure: `Qué ocurre`, factors/examples, consequences, related cases/projects/modules.

- [ ] **Step 1: Record the Rally Chile case as a reusable territorial pain, not as a motorsport-only anecdote.**
- [ ] **Step 2: Capture observed fragmentation: stage geometry/schedule, weather along a route, closure/access/spectator logistics, safety notices, and conflicting/freshness-sensitive public sources.**
- [ ] **Step 3: Link it to existing vault pains `[[Información territorial dispersa]]`, `[[Información operativa fragmentada]]`, `[[Accesibilidad estacional de caminos]]`, and `[[Producción, clima y accesos desconectados]]` where conceptually appropriate.**
- [ ] **Step 4: Distinguish verified evidence from inference/community reports in the note.**

### Task 9: Verification and PR State

**Files:**
- No production files unless verification finds a real defect.

- [ ] **Step 1: Run complete `npm test` in CI.**
- [ ] **Step 2: Run `npm run build` in CI.**
- [ ] **Step 3: Verify the workflow run belongs to the exact final head SHA and every step succeeded.**
- [ ] **Step 4: Confirm PR #1 remains open and unmerged.**
- [ ] **Step 5: Report final head, tests/build status, implemented UX, remaining pending official information, and vault note path.**
