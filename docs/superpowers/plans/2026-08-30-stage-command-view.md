# Stage Command View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the existing Rally Chile stage detail into a presentation-ready, map-first Stage Command View with compact status, clear Pass 1 ↔ Pass 2 time comparison, progressive disclosure, and restrained micro-motion while preserving all current domain behavior.

**Architecture:** Keep the existing weather, geometry, simulation, provenance and MapLibre data flows unchanged. Move only presentation responsibilities: derive display-only operational labels in a small pure helper, render them through one `StageCommandBar`, make `RallyMap` map-only, introduce focused `PassTimeRail` and `StageDisclosure` components, and isolate the new visual system in a dedicated stylesheet. `motion/mini` is the only new runtime UI dependency.

**Tech Stack:** React 19, TypeScript, Vite, MapLibre GL 6, Turf 7, Open-Meteo, `motion/mini`, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-30-stage-command-view-design.md`

## Global Constraints

- Do not change the domain model, weather fetching, historical-reference methodology, route geometry, simulation maths, provenance aggregation or existing data contracts.
- Keep `planned`, `simulated`, and `observed` distinct.
- Keep forecast and historical-reference as distinct evidence modes.
- Unknown values remain unknown; missing values must not become zero.
- Reconstructed geometry remains distinct from verified organizer GPS.
- Official spectator/access/parking/no-spectator geography renders only when each point has sourced coordinates.
- Repeated stages reuse geometry only; time-dependent context remains stage-specific.
- Pass 1 ↔ Pass 2 comparison remains valid only for comparable weather evidence modes.
- Do not introduce grip, mud, dust or road-condition claims.
- Keep the existing palette semantics: amber = stage/time/action, cyan = environmental/modelled data, red = safety/simulation emphasis, green = verified/allowed spatial access, off-white = primary facts.
- Add only one new UI dependency: `motion`, imported from `motion/mini`.
- Do not add Radix, shadcn, AutoAnimate, deck.gl, Cesium or resizable-panel dependencies in this pass.
- Ordinary UI transitions target roughly 160–260 ms.
- Respect `prefers-reduced-motion`; reduced-motion mode must remain fully usable.
- No horizontal scrolling on mobile.
- Keep the current MapLibre worker safeguards in `vite.config.ts` and `src/main.tsx`.
- Every task must leave `npm test` green before commit; run `npm run build` at each layout/integration checkpoint.

---

## File Structure

### New files

- `src/presentation/stageCommandView.ts` — pure display helpers for weather, closure and public-access labels.
- `src/presentation/stageCommandView.test.ts` — contract tests for those labels and evidence wording.
- `src/presentation/passRail.ts` — pure active-pass position helper.
- `src/presentation/passRail.test.ts` — pass-rail behavior tests.
- `src/presentation/uiMotion.ts` — reduced-motion detection and duration helper used by Motion calls.
- `src/presentation/uiMotion.test.ts` — deterministic tests for reduced-motion behavior.
- `src/components/StageCommandBar.tsx` — display-only compact status row.
- `src/components/PassTimeRail.tsx` — visual first-pass/second-pass time rail.
- `src/components/StageDisclosure.tsx` — accessible controlled disclosure with lightweight transition.
- `src/stageCommandView.css` — Stage Command View layout, command bar, disclosures and map-first presentation.

### Existing files modified

- `src/components/StageDetail.tsx` — recompose existing sections into the new hierarchy; do not change data calculations.
- `src/components/RallyMap.tsx` — remove duplicate context strip and detailed weather-card rendering; keep map/data behavior.
- `src/components/StageMapContextStrip.tsx` — delete after command bar replaces it.
- `src/passComparison.css` — replace the two-card selector with the compact time rail while preserving metrics/profile.
- `src/mapIntelligence.css` — remove obsolete `.stage-map-context-strip` rules only; keep map marker/chip styles.
- `src/main.tsx` — import `stageCommandView.css`.
- `src/styles.css` — small cleanup/overrides for map height, compact hero and existing section compatibility.
- `package.json` and lockfile if present — add `motion` only.
- `README.md` — add one short note that the stage detail is map-first and deeper panels are collapsible; do not expand the README again.

---

### Task 1: Unify stage status into one command bar

**Files:**
- Create: `src/presentation/stageCommandView.ts`
- Test: `src/presentation/stageCommandView.test.ts`
- Create: `src/components/StageCommandBar.tsx`
- Modify: `src/components/StageDetail.tsx`
- Modify: `src/components/RallyMap.tsx`
- Delete: `src/components/StageMapContextStrip.tsx`
- Modify: `src/mapIntelligence.css`

**Interfaces:**
- Consumes: `StageSpectatorInfo`, `EnvironmentStatus`, `WeatherMode`, explicit display strings already available in `StageDetail`.
- Produces:
  - `presentCommandWeather(status: EnvironmentStatus, mode: WeatherMode | null): string`
  - `presentCommandClosure(spectator: StageSpectatorInfo | undefined, timezone: string): string`
  - `presentCommandPublicAccess(spectator: StageSpectatorInfo | undefined): string`
  - `StageCommandBar` with explicit display-value props only.

- [ ] **Step 1: Write RED tests for command-view labels**

Create `src/presentation/stageCommandView.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import type { StageSpectatorInfo } from '../domain/rally.ts'
import {
  presentCommandClosure,
  presentCommandPublicAccess,
  presentCommandWeather,
} from './stageCommandView.ts'

function spectator(overrides: Partial<StageSpectatorInfo> = {}): StageSpectatorInfo {
  return {
    status: 'pending',
    spectatorZones: [],
    parking: [],
    accessPoints: [],
    noSpectatorZones: [],
    provenance: { sources: [] },
    ...overrides,
  } as StageSpectatorInfo
}

test('presentCommandWeather keeps forecast and historical reference explicit', () => {
  assert.equal(presentCommandWeather('ready', 'forecast'), 'FORECAST')
  assert.equal(presentCommandWeather('ready', 'historical-reference'), 'HISTORICAL REF · 2021–2025')
  assert.equal(presentCommandWeather('loading', null), 'RESOLVING WEATHER')
  assert.equal(presentCommandWeather('unavailable', null), 'WEATHER UNAVAILABLE')
})

test('presentCommandClosure formats a sourced closure time in the event timezone', () => {
  assert.equal(
    presentCommandClosure(
      spectator({ roadClosureAt: '2026-09-10T20:00:00-03:00' }),
      'America/Santiago',
    ),
    '20:00 PREV',
  )
})

test('presentCommandPublicAccess only reports official points when a public point has source and coordinate', () => {
  assert.equal(presentCommandPublicAccess(spectator()), 'PENDING OFFICIAL POINTS')

  const withOfficialAccess = spectator({
    accessPoints: [{
      id: 'official-access-1',
      label: 'Acceso oficial',
      coordinate: [-72.7, -37.2],
      provenance: {
        sources: [{
          label: 'Organizer map',
          url: 'https://example.com/map',
          accessedAt: '2026-08-30',
        }],
      },
    }],
  })

  assert.equal(presentCommandPublicAccess(withOfficialAccess), 'OFFICIAL POINTS')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/presentation/stageCommandView.test.ts
```

Expected: FAIL because `stageCommandView.ts` does not exist.

- [ ] **Step 3: Implement the pure presentation helpers**

Create `src/presentation/stageCommandView.ts`:

```ts
import type { StageSpectatorInfo } from '../domain/rally.ts'
import type { WeatherMode } from '../map/stageEnvironment.ts'
import type { EnvironmentStatus } from '../components/RallyMap.tsx'

function formatClock(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso))
}

function hasSpatialSource(point: {
  coordinate?: [number, number] | null
  provenance?: { sources?: unknown[] } | null
}): boolean {
  return Boolean(point.coordinate && point.provenance?.sources && point.provenance.sources.length > 0)
}

export function presentCommandWeather(status: EnvironmentStatus, mode: WeatherMode | null): string {
  if (status === 'loading') return 'RESOLVING WEATHER'
  if (status === 'unavailable') return 'WEATHER UNAVAILABLE'
  if (mode === 'historical-reference') return 'HISTORICAL REF · 2021–2025'
  if (mode === 'forecast') return 'FORECAST'
  return 'WEATHER PENDING'
}

export function presentCommandClosure(
  spectator: StageSpectatorInfo | undefined,
  timezone: string,
): string {
  if (spectator?.roadClosureAt) return `${formatClock(spectator.roadClosureAt, timezone)} PREV`
  if (spectator?.roadClosureText) return spectator.roadClosureText.toUpperCase()
  return 'PENDING'
}

export function presentCommandPublicAccess(spectator: StageSpectatorInfo | undefined): string {
  const publicPoints = [
    ...(spectator?.spectatorZones ?? []),
    ...(spectator?.parking ?? []),
    ...(spectator?.accessPoints ?? []),
  ]
  return publicPoints.some(hasSpatialSource) ? 'OFFICIAL POINTS' : 'PENDING OFFICIAL POINTS'
}
```

If the exact `StageSpectatorInfo` point/provenance type shape differs from the structural helper above, use the repository's actual point type while preserving the same rule: coordinate **and** at least one provenance source are required.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm test -- src/presentation/stageCommandView.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add the display-only command bar component**

Create `src/components/StageCommandBar.tsx`:

```tsx
interface StageCommandBarProps {
  distance: string
  technicalDistance?: string | null
  startTime: string
  geometry: string
  weather: string
  closure: string
  publicAccess: string
}

export function StageCommandBar({
  distance,
  technicalDistance,
  startTime,
  geometry,
  weather,
  closure,
  publicAccess,
}: StageCommandBarProps) {
  return (
    <section className="stage-command-bar" aria-label="Resumen operativo del tramo">
      <div><span>DISTANCE</span><strong>{distance}</strong>{technicalDistance ? <small>{technicalDistance}</small> : null}</div>
      <div><span>FIRST CAR</span><strong>{startTime}</strong></div>
      <div><span>GEOMETRY</span><strong>{geometry.toUpperCase()}</strong></div>
      <div><span>WEATHER</span><strong>{weather}</strong></div>
      <div><span>CLOSURE</span><strong>{closure}</strong></div>
      <div><span>PUBLIC ACCESS</span><strong>{publicAccess}</strong></div>
    </section>
  )
}
```

No fetches, `useEffect`, domain calculations or provenance logic belong in this component.

- [ ] **Step 6: Integrate the command bar and remove the duplicate map strip**

In `StageDetail.tsx`:

```ts
import { StageCommandBar } from './StageCommandBar'
import {
  presentCommandClosure,
  presentCommandPublicAccess,
  presentCommandWeather,
} from '../presentation/stageCommandView'
```

Derive display values next to the existing `distance`, `geometryStatus` and weather state:

```ts
const commandWeather = presentCommandWeather(weatherStatus, currentWeatherMode)
const commandClosure = presentCommandClosure(spectator, event.timezone)
const commandPublicAccess = presentCommandPublicAccess(spectator)
```

Replace the old `.stage-facts` row with:

```tsx
<StageCommandBar
  distance={distance.primary}
  technicalDistance={distance.technical}
  startTime={formatClock(stage.scheduledStart, event.timezone)}
  geometry={geometryStatus}
  weather={commandWeather}
  closure={commandClosure}
  publicAccess={commandPublicAccess}
/>
```

In `RallyMap.tsx`:

- remove the `StageMapContextStrip` import and render;
- remove `distancePrimary` and `distanceTechnical` props if they are now unused;
- keep `scheduledStart`, `timezone`, `spectator`, environment loading, annotations and simulation unchanged;
- keep `isSpatiallySourced` for map-point rendering/popup safety.

Delete `src/components/StageMapContextStrip.tsx`.

Remove only `.stage-map-context-strip...` selectors from `src/mapIntelligence.css`; keep map labels, chips, arrows and official-point styles untouched.

- [ ] **Step 7: Run full tests and build**

Run:

```bash
npm test
npm run build
```

Expected: 70 existing tests + the new command-view tests pass; TypeScript and Vite build pass.

- [ ] **Step 8: Commit**

```bash
git add src/presentation/stageCommandView.ts src/presentation/stageCommandView.test.ts src/components/StageCommandBar.tsx src/components/StageDetail.tsx src/components/RallyMap.tsx src/mapIntelligence.css src/components/StageMapContextStrip.tsx
git commit -m "feat: unify stage command status"
```

---

### Task 2: Make the map the primary stage surface

**Files:**
- Modify: `src/components/StageDetail.tsx`
- Modify: `src/components/RallyMap.tsx`
- Create: `src/stageCommandView.css`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: the existing `RallyMap` callback and stage/weather state.
- Produces: the new stage-page order `hero → command bar → large map → pass comparison → concise intelligence → optional detail`.
- No new domain APIs.

- [ ] **Step 1: Add a source-contract test for the map-first order**

Create `src/presentation/stageCommandLayout.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../components/StageDetail.tsx', import.meta.url), 'utf8')

test('StageDetail renders command bar before RallyMap and RallyMap before pass comparison', () => {
  const command = source.indexOf('<StageCommandBar')
  const map = source.indexOf('<RallyMap')
  const pass = source.indexOf('className="pass-comparison"')

  assert.ok(command >= 0)
  assert.ok(map > command)
  assert.ok(pass === -1 || pass > map)
})
```

This is intentionally a narrow structural regression test; it protects the presentation hierarchy without introducing a React test framework.

- [ ] **Step 2: Run the focused layout test and verify RED**

Run:

```bash
npm test -- src/presentation/stageCommandLayout.test.ts
```

Expected: FAIL because the current `RallyMap` still appears below weather/pass sections.

- [ ] **Step 3: Reorder `StageDetail` without changing calculations**

Move the existing `RallyMap` JSX so it renders immediately after `StageCommandBar`.

Target skeleton:

```tsx
<header className="stage-hero stage-command-hero">...</header>

<StageCommandBar ... />

<section className="stage-map-primary" aria-label="Mapa principal del tramo">
  <RallyMap
    geometryStatus={geometryStatus}
    geometry={technicalStage?.geometry ?? null}
    run={run}
    spectator={spectator}
    scheduledStart={stage.scheduledStart}
    timezone={event.timezone}
    simulationEnabled={simulationOpen}
    onEnvironmentChange={handleEnvironmentChange}
  />
</section>

{passPair ? <section className="pass-comparison">...</section> : null}

<div className="intelligence-grid">...</div>
```

Do not move or rewrite the existing state hooks, weather fetch, pass-comparison calculation, safety timeline calculation or source aggregation.

- [ ] **Step 4: Make `RallyMap` map-only at the top level**

`RallyMap` should return the map panel and its map status/attribution UI, but the detailed environment-node grid will be moved to Task 4. At this task, keep the detailed environment grid in place if removing it would create a larger diff; the important checkpoint is that the map canvas itself is now high in the page and the old duplicate strip is gone.

- [ ] **Step 5: Add isolated Stage Command View CSS**

Create `src/stageCommandView.css` with the first-pass layout:

```css
.stage-command-hero {
  padding-bottom: 18px;
  border-bottom: 0;
}

.stage-command-bar {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 1px;
  margin: 0 0 8px;
  border: 1px solid #26333c;
  background: #26333c;
}

.stage-command-bar > div {
  min-width: 0;
  padding: 9px 11px;
  background: #090e12;
}

.stage-command-bar span,
.stage-command-bar small {
  display: block;
  color: #7f929e;
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.stage-command-bar strong {
  display: block;
  margin-top: 4px;
  color: var(--ink);
  font-size: 0.72rem;
  line-height: 1.25;
  text-transform: uppercase;
}

.stage-command-bar small {
  margin-top: 3px;
  color: var(--amber);
  letter-spacing: 0.03em;
}

.stage-map-primary {
  margin-bottom: 10px;
}

.stage-map-primary .map-canvas {
  height: clamp(500px, 66vh, 760px);
}

@media (max-width: 900px) {
  .stage-command-bar { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .stage-map-primary .map-canvas { height: clamp(430px, 62vh, 650px); }
}

@media (max-width: 560px) {
  .stage-command-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stage-map-primary .map-canvas { height: min(62vh, 520px); }
}
```

Import it in `src/main.tsx` after `styles.css` and before the more specific map/pass styles:

```ts
import './styles.css'
import './stageCommandView.css'
import './spectator.css'
import './passComparison.css'
import './mapIntelligence.css'
```

In `styles.css`, remove or neutralize only selectors that conflict with the new map height/order. Do not change global color tokens.

- [ ] **Step 6: Run focused + full verification**

Run:

```bash
npm test -- src/presentation/stageCommandLayout.test.ts
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Manual desktop checkpoint**

Open SS1 and SS4 at desktop width. Verify before continuing:

- title and command bar fit without wrapping into unreadable rows;
- map is visible in the first meaningful viewport;
- START/FINISH, km labels, arrows and environment chips still render;
- SS4 still shows historical-reference mode at the current date;
- no duplicate six-cell context strip appears inside/above the map.

- [ ] **Step 8: Commit**

```bash
git add src/components/StageDetail.tsx src/components/RallyMap.tsx src/stageCommandView.css src/main.tsx src/styles.css src/presentation/stageCommandLayout.test.ts
git commit -m "feat: make stage detail map first"
```

---

### Task 3: Replace pass cards with a compact animated time rail

**Files:**
- Create: `src/presentation/passRail.ts`
- Test: `src/presentation/passRail.test.ts`
- Create: `src/presentation/uiMotion.ts`
- Test: `src/presentation/uiMotion.test.ts`
- Create: `src/components/PassTimeRail.tsx`
- Modify: `src/components/StageDetail.tsx`
- Modify: `src/passComparison.css`
- Modify: `package.json`
- Modify: lockfile generated by `npm install` if present/created.

**Interfaces:**
- Produces:
  - `passRailPercent(activeCode: string, firstCode: string, secondCode: string): 0 | 100`
  - `prefersReducedMotion(matchMediaOverride?): boolean`
  - `motionDuration(reduced: boolean, normalSeconds: number): number`
  - `PassTimeRail` receives only pass codes/names/times/hrefs/active code.
- Existing weather comparison values and `TemperatureDeltaProfile` remain unchanged.

- [ ] **Step 1: Write RED tests for rail position and reduced motion**

Create `src/presentation/passRail.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { passRailPercent } from './passRail.ts'

test('passRailPercent maps first and second pass to opposite rail ends', () => {
  assert.equal(passRailPercent('SS1', 'SS1', 'SS4'), 0)
  assert.equal(passRailPercent('SS4', 'SS1', 'SS4'), 100)
})

test('passRailPercent fails closed to first pass for an unrelated stage code', () => {
  assert.equal(passRailPercent('SS9', 'SS1', 'SS4'), 0)
})
```

Create `src/presentation/uiMotion.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { motionDuration, prefersReducedMotion } from './uiMotion.ts'

test('motionDuration becomes zero when reduced motion is requested', () => {
  assert.equal(motionDuration(true, 0.22), 0)
  assert.equal(motionDuration(false, 0.22), 0.22)
})

test('prefersReducedMotion accepts an injectable matchMedia for deterministic tests', () => {
  assert.equal(prefersReducedMotion(() => ({ matches: true })), true)
  assert.equal(prefersReducedMotion(() => ({ matches: false })), false)
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm test -- src/presentation/passRail.test.ts src/presentation/uiMotion.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the pure helpers**

Create `src/presentation/passRail.ts`:

```ts
export function passRailPercent(
  activeCode: string,
  firstCode: string,
  secondCode: string,
): 0 | 100 {
  if (activeCode === secondCode) return 100
  if (activeCode === firstCode) return 0
  return 0
}
```

Create `src/presentation/uiMotion.ts`:

```ts
type MatchMediaLike = (query: string) => { matches: boolean }

export function prefersReducedMotion(matchMediaOverride?: MatchMediaLike): boolean {
  if (matchMediaOverride) return matchMediaOverride('(prefers-reduced-motion: reduce)').matches
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function motionDuration(reduced: boolean, normalSeconds: number): number {
  return reduced ? 0 : normalSeconds
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/presentation/passRail.test.ts src/presentation/uiMotion.test.ts
```

Expected: PASS.

- [ ] **Step 5: Install Motion and keep the dependency surface minimal**

Run:

```bash
npm install motion
```

Verify `package.json` adds `motion` and no other UI dependency.

Do not import from `motion/react`; this pass uses:

```ts
import { animate } from 'motion/mini'
```

- [ ] **Step 6: Implement `PassTimeRail`**

Create `src/components/PassTimeRail.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { animate } from 'motion/mini'
import { passRailPercent } from '../presentation/passRail'
import { motionDuration, prefersReducedMotion } from '../presentation/uiMotion'

interface PassTimeRailProps {
  activeCode: string
  first: { code: string; name: string; time: string; href: string }
  second: { code: string; name: string; time: string; href: string }
}

export function PassTimeRail({ activeCode, first, second }: PassTimeRailProps) {
  const indicatorRef = useRef<HTMLSpanElement | null>(null)
  const position = passRailPercent(activeCode, first.code, second.code)

  useEffect(() => {
    if (!indicatorRef.current) return
    const reduced = prefersReducedMotion()
    const controls = animate(
      indicatorRef.current,
      { left: `${position}%` },
      { duration: motionDuration(reduced, 0.2), easing: 'ease-out' },
    )
    return () => controls.cancel()
  }, [position])

  return (
    <div className="pass-time-rail" aria-label={`Comparar ${first.code} y ${second.code}`}>
      <a className={activeCode === first.code ? 'pass-time-stop pass-time-stop--active' : 'pass-time-stop'} href={first.href}>
        <span>PASS 1 · {first.code}</span>
        <strong>{first.time}</strong>
        <small>{first.name}</small>
      </a>

      <div className="pass-time-track" aria-hidden="true">
        <span ref={indicatorRef} className="pass-time-indicator" style={{ left: `${position}%` }} />
      </div>

      <a className={activeCode === second.code ? 'pass-time-stop pass-time-stop--active' : 'pass-time-stop'} href={second.href}>
        <span>PASS 2 · {second.code}</span>
        <strong>{second.time}</strong>
        <small>{second.name}</small>
      </a>
    </div>
  )
}
```

If the installed Motion version names the easing option `ease` rather than `easing`, follow the installed package's TypeScript definition and use the typed property. Do not suppress TypeScript errors with `any`.

- [ ] **Step 7: Replace only the current pass selector UI**

In `StageDetail.tsx`, keep `comparisonStatus`, `passComparisonView`, `temperatureProfile` and all delta calculations exactly as they are.

Replace the old `pass-selector/pass-card/pass-arrow` JSX with:

```tsx
<PassTimeRail
  activeCode={stage.code}
  first={{
    code: passPair.firstPass.code,
    name: passPair.firstPass.name,
    time: formatClock(passPair.firstPass.scheduledStart, event.timezone),
    href: `#/${event.id}/${passPair.firstPass.slug}`,
  }}
  second={{
    code: passPair.secondPass.code,
    name: passPair.secondPass.name,
    time: formatClock(passPair.secondPass.scheduledStart, event.timezone),
    href: `#/${event.id}/${passPair.secondPass.slug}`,
  }}
/>
```

Keep the existing four comparison metrics and `TemperatureDeltaProfile` below the rail.

- [ ] **Step 8: Replace selector CSS with rail CSS**

In `src/passComparison.css`, remove `.pass-selector`, `.pass-card*` and `.pass-arrow` rules and add:

```css
.pass-time-rail {
  display: grid;
  grid-template-columns: minmax(145px, auto) minmax(120px, 1fr) minmax(145px, auto);
  gap: 14px;
  align-items: center;
  margin-top: 14px;
}

.pass-time-stop {
  display: grid;
  gap: 3px;
  color: #919ba1;
  text-decoration: none;
}

.pass-time-stop:last-child { text-align: right; }
.pass-time-stop span { color: var(--amber); font-size: 0.56rem; font-weight: 900; letter-spacing: 0.1em; }
.pass-time-stop strong { color: var(--ink); font-size: 1.05rem; }
.pass-time-stop small { color: var(--dim); font-size: 0.62rem; }
.pass-time-stop--active strong { color: var(--amber-bright); }

.pass-time-track {
  position: relative;
  height: 2px;
  margin: 0 7px;
  background: #384248;
}

.pass-time-track::before,
.pass-time-track::after {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  border: 1px solid #69757b;
  border-radius: 50%;
  background: #0a0e11;
  content: '';
  transform: translateY(-50%);
}

.pass-time-track::before { left: 0; transform: translate(-50%, -50%); }
.pass-time-track::after { right: 0; transform: translate(50%, -50%); }

.pass-time-indicator {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border: 2px solid #0a0e11;
  border-radius: 50%;
  background: var(--amber-bright);
  box-shadow: 0 0 0 3px rgba(240, 189, 99, 0.14);
  transform: translate(-50%, -50%);
}

@media (max-width: 640px) {
  .pass-time-rail { grid-template-columns: 1fr 1fr; }
  .pass-time-track { grid-column: 1 / -1; grid-row: 2; }
  .pass-time-stop:last-child { text-align: right; }
}
```

- [ ] **Step 9: Run full tests/build and check pass values are unchanged**

Run:

```bash
npm test
npm run build
```

Expected: all existing weather comparison tests stay green; no numerical changes.

Manual check on SS1 and SS4:

- SS1 still shows the same Pass 2 − Pass 1 values as before;
- SS4 shows the same values with the indicator on Pass 2;
- switching hashes does not remount or alter route geometry unexpectedly;
- reduced-motion browser setting makes the indicator jump or move effectively instantly.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/presentation/passRail.ts src/presentation/passRail.test.ts src/presentation/uiMotion.ts src/presentation/uiMotion.test.ts src/components/PassTimeRail.tsx src/components/StageDetail.tsx src/passComparison.css
git commit -m "feat: add pass time rail motion"
```

If the repository does not use `package-lock.json`, omit it from `git add`; do not invent a second lockfile format.

---

### Task 4: Move deep weather, safety, simulation and provenance behind progressive disclosure

**Files:**
- Create: `src/components/StageDisclosure.tsx`
- Modify: `src/components/StageDetail.tsx`
- Modify: `src/components/RallyMap.tsx`
- Modify: `src/stageCommandView.css`

**Interfaces:**
- `StageDisclosure` props:
  - `id: string`
  - `label: string`
  - `meta?: string`
  - `defaultOpen?: boolean`
  - `children: ReactNode`
- `RallyMap` continues reporting snapshots through `onEnvironmentChange`; `StageDetail` already owns the same snapshots in `currentEnvironment`.

- [ ] **Step 1: Add a source-contract test for accessible disclosures**

Create `src/presentation/stageDisclosureContract.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../components/StageDisclosure.tsx', import.meta.url), 'utf8')

test('StageDisclosure exposes button semantics and ARIA state', () => {
  assert.match(source, /type="button"/)
  assert.match(source, /aria-expanded=/)
  assert.match(source, /aria-controls=/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/presentation/stageDisclosureContract.test.ts
```

Expected: FAIL because `StageDisclosure.tsx` does not exist.

- [ ] **Step 3: Implement accessible controlled disclosure**

Create `src/components/StageDisclosure.tsx`:

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate } from 'motion/mini'
import { motionDuration, prefersReducedMotion } from '../presentation/uiMotion'

interface StageDisclosureProps {
  id: string
  label: string
  meta?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function StageDisclosure({ id, label, meta, defaultOpen = false, children }: StageDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!panelRef.current || !open) return
    const reduced = prefersReducedMotion()
    const controls = animate(
      panelRef.current,
      { opacity: [0.72, 1], transform: ['translateY(-4px)', 'translateY(0px)'] },
      { duration: motionDuration(reduced, 0.18), easing: 'ease-out' },
    )
    return () => controls.cancel()
  }, [open])

  return (
    <section className={`stage-disclosure${open ? ' stage-disclosure--open' : ''}`}>
      <button
        type="button"
        className="stage-disclosure-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{label}</span>
        {meta ? <small>{meta}</small> : null}
        <b aria-hidden="true">{open ? '−' : '+'}</b>
      </button>
      <div id={id} ref={panelRef} className="stage-disclosure-panel" hidden={!open}>
        {children}
      </div>
    </section>
  )
}
```

Use the actual typed easing option accepted by the installed Motion version as in Task 3. The `hidden` state prevents keyboard focus from entering collapsed content; the transition is an entrance animation, while closing is immediate and safe.

- [ ] **Step 4: Run the focused contract test and verify GREEN**

Run:

```bash
npm test -- src/presentation/stageDisclosureContract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Move detailed environment nodes out of `RallyMap`**

`RallyMap` currently builds `environmentCards` from the same snapshots already reported to `StageDetail` via `onEnvironmentChange`.

Remove from `RallyMap`:

```ts
const environmentCards = useMemo(
  () => environment.map((snapshot) => ({ snapshot, view: presentEnvironmentSnapshot(snapshot) })),
  [environment],
)
```

and remove the detailed `.environment-panel` JSX from `RallyMap`.

Do **not** remove:

- `environmentDataset`;
- `environmentStatus`;
- `environment` snapshots used by map annotations;
- `buildEnvironmentChips`;
- `onEnvironmentChange` callback;
- map layers/markers.

In `StageDetail.tsx`, import:

```ts
import { presentEnvironmentSnapshot } from '../map/environmentView'
```

and derive:

```ts
const environmentCards = useMemo(
  () => currentEnvironment.map((snapshot) => ({ snapshot, view: presentEnvironmentSnapshot(snapshot) })),
  [currentEnvironment],
)
```

Render the existing weather-node grid inside:

```tsx
<StageDisclosure
  id="stage-weather-detail"
  label="WEATHER ALONG STAGE"
  meta={currentWeatherSource ?? undefined}
>
  {/* existing environment header/grid/source/methodology content */}
</StageDisclosure>
```

Preserve the existing note that the nodes are not stations and preserve the historical methodology note when present.

- [ ] **Step 6: Wrap the existing safety timeline without changing offsets**

Keep the existing `safetyTimeline` `useMemo` untouched. Move only its JSX into:

```tsx
<StageDisclosure
  id="stage-safety-timeline"
  label="SAFETY TRAIN TIMELINE"
  meta={`${safetyTimeline.length} steps`}
>
  {/* current safety timeline cards */}
</StageDisclosure>
```

- [ ] **Step 7: Wrap simulation while preserving the same enable state**

Keep `simulationOpen`, `run`, `startSlots`, `fleetSnapshot` behavior and `RallyMap simulationEnabled={simulationOpen}` unchanged.

Wrap the current simulation gate/details in:

```tsx
<StageDisclosure
  id="stage-simulation"
  label="SIMULATION"
  meta={run ? 'OPTIONAL LAYER' : 'PENDING'}
>
  {/* existing simulation gate and details */}
</StageDisclosure>
```

The existing simulation button remains the control that enables/disables map vehicle motion. Opening the disclosure by itself must not start the simulation.

- [ ] **Step 8: Wrap provenance without removing source dates or disclaimers**

Move the current `.sources` block into:

```tsx
<StageDisclosure
  id="stage-provenance"
  label="PROVENANCE"
  meta={`${sources.length} sources`}
>
  {/* existing source list, source-note and integrity text */}
</StageDisclosure>
```

No source URL, access date or attribution may be dropped.

- [ ] **Step 9: Add disclosure styles**

Append to `src/stageCommandView.css`:

```css
.stage-detail-stack {
  display: grid;
  gap: 7px;
  margin-top: 10px;
}

.stage-disclosure {
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: #090d10;
}

.stage-disclosure-trigger {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}

.stage-disclosure-trigger > span {
  color: var(--amber);
  font-size: 0.61rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.stage-disclosure-trigger small {
  color: var(--dim);
  font-size: 0.58rem;
}

.stage-disclosure-trigger b {
  color: var(--amber-bright);
  font-size: 1rem;
  font-weight: 500;
}

.stage-disclosure-panel {
  padding: 0 14px 14px;
}

.stage-disclosure-trigger:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: -2px;
}

@media (max-width: 560px) {
  .stage-disclosure-trigger { grid-template-columns: 1fr auto; }
  .stage-disclosure-trigger small { grid-column: 1 / -1; grid-row: 2; padding-bottom: 8px; }
}
```

- [ ] **Step 10: Run full tests/build and manual simulation regression**

Run:

```bash
npm test
npm run build
```

Manual SS1 check:

1. map renders with no simulation when disclosure is closed;
2. opening `SIMULATION` does not start cars;
3. clicking the existing simulation button starts the exact same fleet behavior;
4. closing/reopening the disclosure does not corrupt map state;
5. source/provenance and weather detail remain reachable by keyboard.

- [ ] **Step 11: Commit**

```bash
git add src/components/StageDisclosure.tsx src/components/StageDetail.tsx src/components/RallyMap.tsx src/stageCommandView.css src/presentation/stageDisclosureContract.test.ts
git commit -m "feat: add progressive stage detail"
```

---

### Task 5: Apply restrained entrance motion and presentation polish

**Files:**
- Modify: `src/components/StageDetail.tsx`
- Modify: `src/stageCommandView.css`
- Modify: `src/styles.css`
- Modify: `src/passComparison.css`

**Interfaces:**
- Consumes: `animate`, `prefersReducedMotion`, `motionDuration` from Task 3.
- Produces: subtle stage header and map reveal only; no new state or data flow.

- [ ] **Step 1: Add a reduced-motion CSS contract test**

Create `src/presentation/stageCommandMotionContract.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../stageCommandView.css', import.meta.url), 'utf8')

test('Stage Command View includes a reduced-motion fallback', () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/presentation/stageCommandMotionContract.test.ts
```

Expected: FAIL until the media query is added.

- [ ] **Step 3: Add two local refs and restrained entrance animations**

In `StageDetail.tsx` update the React import to include `useRef`, and import:

```ts
import { animate } from 'motion/mini'
import { motionDuration, prefersReducedMotion } from '../presentation/uiMotion'
```

Add:

```ts
const heroRef = useRef<HTMLElement | null>(null)
const mapStageRef = useRef<HTMLElement | null>(null)

useEffect(() => {
  const reduced = prefersReducedMotion()
  const duration = motionDuration(reduced, 0.22)
  const controls = [
    heroRef.current
      ? animate(heroRef.current, { opacity: [0.92, 1], transform: ['translateY(5px)', 'translateY(0px)'] }, { duration })
      : null,
    mapStageRef.current
      ? animate(mapStageRef.current, { opacity: [0.94, 1], transform: ['scale(0.995)', 'scale(1)'] }, { duration, delay: reduced ? 0 : 0.04 })
      : null,
  ]
  return () => controls.forEach((control) => control?.cancel())
}, [stage.code])
```

Attach the refs:

```tsx
<header ref={heroRef} className="stage-hero stage-command-hero">...</header>
<section ref={mapStageRef} className="stage-map-primary" ...>...</section>
```

Use only typed Motion options accepted by the installed version. Do not animate map coordinates, markers or MapLibre camera state from Motion.

- [ ] **Step 4: Tighten hierarchy and reduce equal-weight boxes**

In `stageCommandView.css` and only the necessary existing selectors:

- reduce hero vertical padding;
- make command bar visually secondary to the map;
- remove outer borders from purely editorial headings;
- keep strong borders for safety/provenance-sensitive warnings;
- keep weather values cyan and stage/time/action amber;
- keep the map panel border at one pixel;
- avoid shadows on ordinary content cards;
- keep map labels unchanged.

Add:

```css
.stage-command-view .section-heading {
  border-bottom-color: rgba(42, 52, 60, 0.72);
}

.stage-command-view .weather-metrics article,
.stage-command-view .pass-comparison-metrics article {
  border-color: #223039;
  background: #091015;
}

.stage-command-view .intelligence-grid {
  margin-top: 8px;
}
```

Add `stage-command-view` to the stage `<main>` class list:

```tsx
<main className="app-shell stage-detail-shell stage-command-view">
```

- [ ] **Step 5: Add reduced-motion CSS fallback**

Append:

```css
@media (prefers-reduced-motion: reduce) {
  .stage-command-view *,
  .stage-command-view *::before,
  .stage-command-view *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

Do not use `display: none`, opacity changes or content suppression inside reduced-motion rules.

- [ ] **Step 6: Finish mobile behavior**

At `max-width: 780px` / `560px` verify and adjust:

- hero becomes single column;
- share button stays reachable near the title;
- command bar is 2 columns at phone width;
- map remains before deep analytics;
- pass rail has no horizontal overflow;
- comparison metrics are 2 columns then 1 column at narrow width;
- disclosures use full-width touch targets;
- source URLs wrap rather than overflow;
- no stage title or badge forces page width beyond the viewport.

Use:

```css
.stage-command-view,
.stage-command-view * {
  min-width: 0;
}

.stage-disclosure-panel a,
.stage-command-view .sources a {
  overflow-wrap: anywhere;
}
```

Do not globally apply `overflow-x: hidden` to hide layout bugs.

- [ ] **Step 7: Run contract/full tests and production build**

Run:

```bash
npm test -- src/presentation/stageCommandMotionContract.test.ts
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 8: Manual reduced-motion and responsive checkpoint**

In Firefox:

- desktop width ~1440 px;
- laptop width ~1024 px;
- phone width ~390 px;
- reduced-motion preference enabled.

Verify content order, keyboard access, no horizontal scroll, map markers remain legible, and Motion effects do not delay interaction.

- [ ] **Step 9: Commit**

```bash
git add src/components/StageDetail.tsx src/stageCommandView.css src/styles.css src/passComparison.css src/presentation/stageCommandMotionContract.test.ts
git commit -m "style: polish Stage Command View"
```

---

### Task 6: Final regression pass, README checkpoint and PR evidence

**Files:**
- Modify: `README.md`
- No domain code changes expected.

**Interfaces:**
- Produces: verified presentation-ready feature branch with current documentation and reproducible CI evidence.

- [ ] **Step 1: Run the complete local verification from a clean install state**

Run:

```bash
npm install
npm test
npm run build
```

Expected:

- all pre-existing 70 tests plus the new presentation tests pass;
- TypeScript compile passes;
- Vite production build passes;
- no new vulnerability/error is introduced by the single Motion dependency.

A Vite chunk-size warning may remain if it is the same pre-existing warning; do not start unrelated code-splitting work in this task.

- [ ] **Step 2: Verify all six Friday stages in Firefox**

Open:

```text
#/chile-2026/ss1-turquia
#/chile-2026/ss2-nuevo-rere
#/chile-2026/ss3-hualqui
#/chile-2026/ss4-turquia
#/chile-2026/ss5-nuevo-rere
#/chile-2026/ss6-hualqui
```

For every stage verify:

- stage name/code/time/distance visible;
- geometry status visible;
- map high in the page;
- START/FINISH visible;
- 5 km markers visible where applicable;
- route arrows visible;
- environmental chips visible when weather dataset is ready;
- correct `FORECAST` or `HISTORICAL REF · 2021–2025` label;
- official spatial points only where sourced;
- disclosures open/close with keyboard and mouse;
- no horizontal scroll.

- [ ] **Step 3: Verify repeated-pass evidence integrity**

For SS1↔SS4, SS2↔SS5 and SS3↔SS6:

- the rail points to the active pass;
- first/second times remain correct;
- weather comparisons appear only when evidence modes are comparable;
- `Pass 2 − Pass 1` values match the previous implementation;
- temperature profile remains unchanged numerically;
- no road-condition inference appears.

- [ ] **Step 4: Verify SS1 simulation regression**

On SS1:

- open Simulation disclosure;
- start simulation using the existing control;
- confirm ten generic P1 vehicles and the current timing model still behave as before;
- confirm closing the disclosure does not alter the underlying simulation contract;
- confirm map animation remains MapLibre/requestAnimationFrame based, not Motion-controlled.

- [ ] **Step 5: Update README with one compact presentation note**

Add under `## What you see on a stage map` after the current list:

```markdown
The stage detail uses a map-first command view: the route and operational status stay visible first, while node-by-node weather, safety timing, simulation details and provenance remain available in collapsible sections below.
```

Do not add a new long design section.

- [ ] **Step 6: Run final tests/build after README change**

Run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit the documentation checkpoint**

```bash
git add README.md
git commit -m "docs: describe Stage Command View"
```

- [ ] **Step 8: Verify CI and Vercel on the final head**

After pushing/committing through the connected repository flow, verify the final PR head has:

- GitHub Actions `CI` conclusion `success`;
- test count equal to the local suite;
- TypeScript/Vite build success;
- Vercel deployment status `success`.

Do not merge the PR automatically. Leave the branch open for the final visual approval.

- [ ] **Step 9: Record the final PR verification summary**

Update the PR body verification block to the actual final head SHA/run values and summarize:

```markdown
## Stage Command View verification

- map-first stage hierarchy
- compact command status bar
- Pass 1 ↔ Pass 2 time rail
- progressive weather/safety/simulation/provenance detail
- reduced-motion support
- Firefox desktop + mobile-width smoke test
- full automated suite green
- TypeScript + Vite production build green
- Vercel preview green
```

Use the actual test count and head SHA from CI; do not copy the previous `70/70` number if new presentation tests increase the total.

---

## Implementation Order Rationale

1. **Command bar first** removes duplicate status information without touching layout-heavy pieces.
2. **Map-first reordering second** creates the largest visible improvement while all data paths remain unchanged.
3. **Pass rail third** introduces the single Motion dependency in one isolated feature before motion spreads anywhere else.
4. **Progressive disclosure fourth** shortens the page after the primary hierarchy is already stable.
5. **Polish/motion fifth** happens only after structure is correct, preventing animation from masking layout problems.
6. **Final regression last** protects the current scientific/evidential behavior and keeps the PR unmerged until visual approval.

## Explicit Non-Goals During Execution

Do not opportunistically:

- migrate MapLibre to Cesium;
- add deck.gl TripsLayer;
- replace CSS with Tailwind;
- introduce a component library;
- change Open-Meteo requests;
- change historical median methodology;
- alter Friday geometry datasets;
- add new WRC data sources;
- recalibrate fleet timing;
- split unrelated bundles because of the existing Vite size warning;
- refactor the whole `StageDetail` domain/state layer.

Any of those is a separate task/spec after this Stage Command View is stable.