# Stage Command View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the existing Rally Chile stage detail into a presentation-ready, map-first Stage Command View with compact status, a clearer Pass 1 ↔ Pass 2 time comparison, progressive disclosure, and restrained micro-motion while preserving all current domain behavior.

**Architecture:** Keep the existing weather, geometry, simulation, provenance and MapLibre data flows unchanged. Move only display responsibilities: derive operational labels in a small pure helper, replace duplicate status rows with one `StageCommandBar`, reorder the existing stage page around the map, add focused `PassTimeRail` and `StageDisclosure` components, and isolate the new visual system in a dedicated stylesheet. `motion/mini` is the only new runtime UI dependency.

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
- Preserve the repository's current package-management pattern; do not introduce a lockfile if the repository intentionally has none.
- Every task must leave `npm test` green before commit; run `npm run build` at each layout/integration checkpoint.

---

## File Structure

### New files

- `src/presentation/stageCommandView.ts` — pure weather/closure/public-access display labels.
- `src/presentation/stageCommandView.test.ts` — tests for those labels and evidence wording.
- `src/presentation/passRail.ts` — pure active-pass position helper.
- `src/presentation/passRail.test.ts` — pass-rail tests.
- `src/presentation/uiMotion.ts` — reduced-motion detection and duration helper.
- `src/presentation/uiMotion.test.ts` — deterministic motion-preference tests.
- `src/components/StageCommandBar.tsx` — display-only compact status row.
- `src/components/PassTimeRail.tsx` — visual first-pass/second-pass time rail.
- `src/components/StageDisclosure.tsx` — accessible controlled disclosure.
- `src/stageCommandView.css` — command-view layout, status bar, disclosures and map-first presentation.

### Existing files modified

- `src/components/StageDetail.tsx` — recompose existing sections; no data-calculation changes.
- `src/components/RallyMap.tsx` — remove the duplicate context strip and wrap its existing detailed weather panel in progressive disclosure; keep weather/map ownership intact.
- `src/components/StageMapContextStrip.tsx` — delete after command bar replaces it.
- `src/passComparison.css` — replace two large pass cards with the time rail while preserving metrics/profile.
- `src/mapIntelligence.css` — remove obsolete context-strip rules only; keep map markers/chips.
- `src/main.tsx` — import `stageCommandView.css`.
- `src/styles.css` — minimal compatibility/presentation adjustments.
- `package.json` — add `motion` only.
- `README.md` — one compact note describing map-first layout and collapsible detail.

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
- Produces:
  - `StageCommandWeatherStatus = 'idle' | 'loading' | 'ready' | 'unavailable'`
  - `presentCommandWeather(status, mode): string`
  - `presentCommandClosure(spectator, timezone): string`
  - `presentCommandPublicAccess(spectator): string`
  - `StageCommandBar` with explicit display strings only.

- [ ] **Step 1: Write RED tests for the display labels**

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
    stageId: 'stage-1',
    accessStatus: 'pending',
    spectatorZones: [],
    parking: [],
    accessPoints: [],
    noSpectatorZones: [],
    services: [],
    provenance: { state: 'planned', sources: [] },
    ...overrides,
  }
}

test('presentCommandWeather keeps forecast and historical reference explicit', () => {
  assert.equal(presentCommandWeather('ready', 'forecast'), 'FORECAST')
  assert.equal(presentCommandWeather('ready', 'historical-reference'), 'HISTORICAL REF · 2021–2025')
  assert.equal(presentCommandWeather('loading', null), 'RESOLVING WEATHER')
  assert.equal(presentCommandWeather('unavailable', null), 'WEATHER UNAVAILABLE')
})

test('presentCommandClosure formats closure time in the event timezone', () => {
  assert.equal(
    presentCommandClosure(
      spectator({ roadClosureAt: '2026-09-10T20:00:00-03:00' }),
      'America/Santiago',
    ),
    '20:00 PREV',
  )
})

test('presentCommandPublicAccess requires both coordinate and provenance', () => {
  assert.equal(presentCommandPublicAccess(spectator()), 'PENDING OFFICIAL POINTS')

  assert.equal(
    presentCommandPublicAccess(spectator({
      accessPoints: [{
        id: 'official-access-1',
        label: 'Acceso oficial',
        coordinate: [-72.7, -37.2],
        provenance: {
          state: 'planned',
          sources: [{
            label: 'Organizer map',
            url: 'https://example.com/map',
            accessedAt: '2026-08-30',
          }],
        },
      }],
    })),
    'OFFICIAL POINTS',
  )
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/presentation/stageCommandView.test.ts
```

Expected: FAIL because `stageCommandView.ts` does not exist.

- [ ] **Step 3: Implement the pure presentation helper**

Create `src/presentation/stageCommandView.ts`:

```ts
import type { StageSpectatorInfo } from '../domain/rally.ts'
import type { WeatherMode } from '../map/stageEnvironment.ts'

export type StageCommandWeatherStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

function formatClock(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso))
}

function hasSpatialSource(point: {
  coordinate?: [number, number]
  provenance?: { sources: unknown[] }
}): boolean {
  return Boolean(point.coordinate && point.provenance?.sources.length)
}

export function presentCommandWeather(
  status: StageCommandWeatherStatus,
  mode: WeatherMode | null,
): string {
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

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm test -- src/presentation/stageCommandView.test.ts
```

Expected: PASS.

- [ ] **Step 5: Create the display-only command bar**

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

This component must contain no fetch, `useEffect`, geometry logic or provenance logic.

- [ ] **Step 6: Integrate one status surface and remove the duplicate strip**

In `StageDetail.tsx`:

```ts
import { StageCommandBar } from './StageCommandBar'
import {
  presentCommandClosure,
  presentCommandPublicAccess,
  presentCommandWeather,
} from '../presentation/stageCommandView'
```

Near the existing `distance` and `geometryStatus` values:

```ts
const commandWeather = presentCommandWeather(weatherStatus, currentWeatherMode)
const commandClosure = presentCommandClosure(spectator, event.timezone)
const commandPublicAccess = presentCommandPublicAccess(spectator)
```

Replace the old `.stage-facts` block with:

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

- remove `StageMapContextStrip` import and JSX;
- remove `distancePrimary` / `distanceTechnical` props when no longer used;
- remove local `closureLabel` and `publicAccessLabel` helpers when no longer used;
- keep `isSpatiallySourced`, `formatClock`, environment loading, annotations, map sources/layers and simulation unchanged.

Delete `src/components/StageMapContextStrip.tsx`.

Remove only `.stage-map-context-strip...` selectors from `src/mapIntelligence.css`.

- [ ] **Step 7: Run full tests/build**

```bash
npm test
npm run build
```

Expected: all existing 70 tests plus the new command-view tests pass; TypeScript/Vite build passes.

- [ ] **Step 8: Commit**

```bash
git add src/presentation/stageCommandView.ts src/presentation/stageCommandView.test.ts src/components/StageCommandBar.tsx src/components/StageDetail.tsx src/components/RallyMap.tsx src/mapIntelligence.css
git rm src/components/StageMapContextStrip.tsx
git commit -m "feat: unify stage command status"
```

---

### Task 2: Make the map the primary stage surface

**Files:**
- Create: `src/presentation/stageCommandLayout.test.ts`
- Modify: `src/components/StageDetail.tsx`
- Create: `src/stageCommandView.css`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces the page order: `hero → command bar → large map → pass comparison → concise conditions/access → optional detail`.
- No new domain API.

- [ ] **Step 1: Write a RED structural regression test**

Create `src/presentation/stageCommandLayout.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../components/StageDetail.tsx', import.meta.url), 'utf8')

test('StageDetail keeps command bar before map and map before pass comparison', () => {
  const command = source.indexOf('<StageCommandBar')
  const map = source.indexOf('<RallyMap')
  const pass = source.indexOf('className="pass-comparison"')

  assert.ok(command >= 0)
  assert.ok(map > command)
  assert.ok(pass === -1 || pass > map)
})
```

- [ ] **Step 2: Run it and verify RED**

```bash
npm test -- src/presentation/stageCommandLayout.test.ts
```

Expected: FAIL because the current map still renders below the weather/pass blocks.

- [ ] **Step 3: Reorder existing JSX only**

Move the existing `RallyMap` call immediately after `StageCommandBar`:

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
```

Do not move/rewrite the hooks or calculations that produce `weatherSummary`, `passComparisonData`, `safetyTimeline`, `startSlots`, `conditions` or `sources`.

- [ ] **Step 4: Add isolated command-view CSS**

Create `src/stageCommandView.css`:

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

.stage-map-primary { margin-bottom: 10px; }
.stage-map-primary .map-canvas { height: clamp(500px, 66vh, 760px); }

@media (max-width: 900px) {
  .stage-command-bar { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .stage-map-primary .map-canvas { height: clamp(430px, 62vh, 650px); }
}

@media (max-width: 560px) {
  .stage-command-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stage-map-primary .map-canvas { height: min(62vh, 520px); }
}
```

Import it in `src/main.tsx`:

```ts
import './styles.css'
import './stageCommandView.css'
import './spectator.css'
import './passComparison.css'
import './mapIntelligence.css'
```

Adjust only conflicting existing selectors in `styles.css`; keep global color tokens unchanged.

- [ ] **Step 5: Run focused/full verification**

```bash
npm test -- src/presentation/stageCommandLayout.test.ts
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 6: Manual desktop checkpoint**

On SS1 and SS4 verify:

- title + command bar stay compact;
- map is visible in the first meaningful viewport;
- START/FINISH, distance labels, arrows and weather chips still render;
- current historical-reference wording remains correct;
- no duplicate status strip exists.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/stageCommandLayout.test.ts src/components/StageDetail.tsx src/stageCommandView.css src/main.tsx src/styles.css
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

**Interfaces:**
- `passRailPercent(activeCode, firstCode, secondCode): 0 | 100`
- `prefersReducedMotion(matchMediaOverride?): boolean`
- `motionDuration(reduced, normalSeconds): number`
- `PassTimeRail` receives pass codes/names/times/hrefs/active code only.
- Existing weather deltas and `TemperatureDeltaProfile` remain unchanged.

- [ ] **Step 1: Write RED helper tests**

Create `src/presentation/passRail.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { passRailPercent } from './passRail.ts'

test('passRailPercent maps first and second pass to opposite rail ends', () => {
  assert.equal(passRailPercent('SS1', 'SS1', 'SS4'), 0)
  assert.equal(passRailPercent('SS4', 'SS1', 'SS4'), 100)
})

test('passRailPercent fails closed to first pass for an unrelated code', () => {
  assert.equal(passRailPercent('SS9', 'SS1', 'SS4'), 0)
})
```

Create `src/presentation/uiMotion.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { motionDuration, prefersReducedMotion } from './uiMotion.ts'

test('motionDuration becomes zero for reduced motion', () => {
  assert.equal(motionDuration(true, 0.22), 0)
  assert.equal(motionDuration(false, 0.22), 0.22)
})

test('prefersReducedMotion accepts injected matchMedia', () => {
  assert.equal(prefersReducedMotion(() => ({ matches: true })), true)
  assert.equal(prefersReducedMotion(() => ({ matches: false })), false)
})
```

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- src/presentation/passRail.test.ts src/presentation/uiMotion.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the helpers**

`src/presentation/passRail.ts`:

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

`src/presentation/uiMotion.ts`:

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

- [ ] **Step 4: Run and verify GREEN**

```bash
npm test -- src/presentation/passRail.test.ts src/presentation/uiMotion.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add the one Motion dependency without changing package-management pattern**

If the repository still has no committed lockfile:

```bash
npm install --no-package-lock motion
```

If a committed npm lockfile exists at execution time, use normal `npm install motion` and commit the updated lockfile.

Verify no Radix/shadcn/AutoAnimate/deck.gl dependency appears.

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
    const controls = animate(
      indicatorRef.current,
      { left: `${position}%` },
      {
        duration: motionDuration(prefersReducedMotion(), 0.2),
        ease: 'easeOut',
      },
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

Do not suppress Motion typing with `any`; if the installed version rejects an option name, use the option exposed by its TypeScript definitions.

- [ ] **Step 7: Replace only the selector UI in `StageDetail`**

Keep `comparisonStatus`, `passComparisonView`, `temperatureProfile` and all weather calculations unchanged.

Use:

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

Keep the four existing comparison metrics and `TemperatureDeltaProfile` underneath.

- [ ] **Step 8: Replace pass-card CSS with time-rail CSS**

In `src/passComparison.css`, remove `.pass-selector`, `.pass-card*`, `.pass-arrow`, then add:

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
}
```

- [ ] **Step 9: Verify no comparison regression**

```bash
npm test
npm run build
```

Manual SS1/SS4 check:

- same Pass 2 − Pass 1 values as before;
- indicator is on correct pass;
- same temperature profile;
- route geometry does not change when switching repeated passes;
- reduced-motion mode makes movement immediate/minimal.

- [ ] **Step 10: Commit**

```bash
git add package.json src/presentation/passRail.ts src/presentation/passRail.test.ts src/presentation/uiMotion.ts src/presentation/uiMotion.test.ts src/components/PassTimeRail.tsx src/components/StageDetail.tsx src/passComparison.css
git commit -m "feat: add pass time rail motion"
```

Include an existing lockfile in `git add` only if the repository already tracks one.

---

### Task 4: Put deep detail behind accessible progressive disclosure

**Files:**
- Create: `src/components/StageDisclosure.tsx`
- Create: `src/presentation/stageDisclosureContract.test.ts`
- Modify: `src/components/RallyMap.tsx`
- Modify: `src/components/StageDetail.tsx`
- Modify: `src/stageCommandView.css`

**Interfaces:**
- `StageDisclosure` props: `id`, `label`, optional `meta`, optional `defaultOpen`, `children`.
- Existing `RallyMap` keeps owning its environment dataset/methodology note.
- Existing `StageDetail` keeps owning safety timeline, simulation UI and source list.

- [ ] **Step 1: Write RED accessibility contract test**

Create `src/presentation/stageDisclosureContract.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../components/StageDisclosure.tsx', import.meta.url), 'utf8')

test('StageDisclosure exposes a button with explicit ARIA state and target', () => {
  assert.match(source, /type="button"/)
  assert.match(source, /aria-expanded=/)
  assert.match(source, /aria-controls=/)
  assert.match(source, /aria-hidden=/)
})
```

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- src/presentation/stageDisclosureContract.test.ts
```

Expected: FAIL because `StageDisclosure.tsx` does not exist.

- [ ] **Step 3: Implement controlled disclosure with safe collapsed focus behavior**

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
    if (!panelRef.current) return
    const controls = animate(
      panelRef.current,
      open
        ? { opacity: [0.72, 1], transform: ['translateY(-4px)', 'translateY(0px)'] }
        : { opacity: [1, 0.72], transform: ['translateY(0px)', 'translateY(-2px)'] },
      { duration: motionDuration(prefersReducedMotion(), 0.18), ease: 'easeOut' },
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
      <div
        id={id}
        className="stage-disclosure-body"
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
        inert={!open}
      >
        <div ref={panelRef} className="stage-disclosure-panel">
          {children}
        </div>
      </div>
    </section>
  )
}
```

If React's installed DOM typings reject boolean `inert`, use the standards-compliant form accepted by those typings; do not remove the focus guard and do not use `any`.

- [ ] **Step 4: Run focused test and build immediately**

```bash
npm test -- src/presentation/stageDisclosureContract.test.ts
npm run build
```

Expected: PASS. This build checkpoint confirms the actual React 19 `inert` typing before integration.

- [ ] **Step 5: Wrap the existing detailed weather panel inside `RallyMap`**

Do **not** move environment data ownership.

Keep unchanged:

- `environmentDataset` / `environmentStatus`;
- `environmentCards`;
- `buildEnvironmentChips`;
- `onEnvironmentChange`;
- `environmentDataset.methodologyNote`;
- map sources/layers/markers.

Wrap the existing `.environment-panel` JSX:

```tsx
<StageDisclosure
  id="stage-weather-detail"
  label="WEATHER ALONG STAGE"
  meta={environmentDataset?.sourceLabel ?? 'WEATHER PENDING'}
>
  <section className="environment-panel" aria-label="Contexto ambiental a lo largo del tramo">
    {/* existing environment header, state, node cards, methodology note and source line unchanged */}
  </section>
</StageDisclosure>
```

This is intentionally a wrapper-only change so the historical methodology note cannot be lost.

- [ ] **Step 6: Wrap safety timeline in `StageDetail` without changing offsets**

Keep `safetyTimeline` `useMemo` untouched. Wrap only its rendered timeline:

```tsx
<StageDisclosure
  id="stage-safety-timeline"
  label="SAFETY TRAIN TIMELINE"
  meta={`${safetyTimeline.length} steps`}
>
  {/* existing timeline JSX unchanged */}
</StageDisclosure>
```

- [ ] **Step 7: Wrap simulation without changing its activation contract**

Keep `simulationOpen`, `run`, `startSlots` and `RallyMap simulationEnabled={simulationOpen}` unchanged.

```tsx
<StageDisclosure
  id="stage-simulation"
  label="SIMULATION"
  meta={run ? 'OPTIONAL LAYER' : 'PENDING'}
>
  {/* existing simulation-gate and simulation-details JSX unchanged */}
</StageDisclosure>
```

Opening the disclosure must **not** start vehicle motion; the existing simulation button remains authoritative.

- [ ] **Step 8: Wrap provenance without dropping sources or dates**

```tsx
<StageDisclosure
  id="stage-provenance"
  label="PROVENANCE"
  meta={`${sources.length} sources`}
>
  {/* existing sources block, notes, disclaimers and access dates unchanged */}
</StageDisclosure>
```

- [ ] **Step 9: Add disclosure CSS**

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
.stage-disclosure-trigger small { color: var(--dim); font-size: 0.58rem; }
.stage-disclosure-trigger b { color: var(--amber-bright); font-size: 1rem; font-weight: 500; }
.stage-disclosure-trigger:focus-visible { outline: 2px solid var(--cyan); outline-offset: -2px; }

.stage-disclosure-body {
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition: grid-template-rows 180ms ease;
}
.stage-disclosure-body[data-open='true'] { grid-template-rows: 1fr; }
.stage-disclosure-panel { min-height: 0; overflow: hidden; padding: 0 14px; }
.stage-disclosure-body[data-open='true'] .stage-disclosure-panel { padding-bottom: 14px; }

@media (max-width: 560px) {
  .stage-disclosure-trigger { grid-template-columns: 1fr auto; }
  .stage-disclosure-trigger small { grid-column: 1 / -1; grid-row: 2; padding-bottom: 8px; }
}
```

- [ ] **Step 10: Run full regression and manual SS1 simulation check**

```bash
npm test
npm run build
```

Manual:

1. open weather detail and confirm all current nodes/methodology/source text remains;
2. open Simulation — cars must still be off;
3. click existing simulation control — cars behave exactly as before;
4. provenance and safety remain keyboard reachable;
5. collapsed content cannot receive keyboard focus.

- [ ] **Step 11: Commit**

```bash
git add src/components/StageDisclosure.tsx src/presentation/stageDisclosureContract.test.ts src/components/RallyMap.tsx src/components/StageDetail.tsx src/stageCommandView.css
git commit -m "feat: add progressive stage detail"
```

---

### Task 5: Apply restrained entrance motion and final visual hierarchy

**Files:**
- Create: `src/presentation/stageCommandMotionContract.test.ts`
- Modify: `src/components/StageDetail.tsx`
- Modify: `src/stageCommandView.css`
- Modify: `src/styles.css`
- Modify: `src/passComparison.css`

**Interfaces:**
- Uses `animate`, `prefersReducedMotion`, `motionDuration` from Task 3.
- Adds no new data/state contract.

- [ ] **Step 1: Write RED reduced-motion contract test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../stageCommandView.css', import.meta.url), 'utf8')

test('Stage Command View contains a reduced-motion fallback', () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})
```

Save as `src/presentation/stageCommandMotionContract.test.ts`.

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- src/presentation/stageCommandMotionContract.test.ts
```

Expected: FAIL before the media query exists.

- [ ] **Step 3: Add restrained hero/map reveal**

In `StageDetail.tsx`, add `useRef` and imports:

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
      ? animate(
          heroRef.current,
          { opacity: [0.92, 1], transform: ['translateY(5px)', 'translateY(0px)'] },
          { duration, ease: 'easeOut' },
        )
      : null,
    mapStageRef.current
      ? animate(
          mapStageRef.current,
          { opacity: [0.94, 1], transform: ['scale(0.995)', 'scale(1)'] },
          { duration, delay: reduced ? 0 : 0.04, ease: 'easeOut' },
        )
      : null,
  ]
  return () => controls.forEach((control) => control?.cancel())
}, [stage.code])
```

Attach refs to the stage hero and `stage-map-primary` section.

Motion must never animate MapLibre coordinates, route features or camera state.

- [ ] **Step 4: Reduce equal-weight boxes and preserve semantic colors**

Add `stage-command-view` to the stage `<main>`:

```tsx
<main className="app-shell stage-detail-shell stage-command-view">
```

In command-view CSS:

```css
.stage-command-view .section-heading {
  border-bottom-color: rgba(42, 52, 60, 0.72);
}
.stage-command-view .weather-metrics article,
.stage-command-view .pass-comparison-metrics article {
  border-color: #223039;
  background: #091015;
}
.stage-command-view .intelligence-grid { margin-top: 8px; }
```

Keep safety warnings visually stronger than ordinary cards. Do not recolor map labels or evidence states merely for decoration.

- [ ] **Step 5: Add reduced-motion CSS**

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

This rule must not hide or suppress content.

- [ ] **Step 6: Finish responsive behavior without hiding overflow bugs**

At laptop/tablet/phone breakpoints ensure:

- hero is single column when needed;
- share control remains near title;
- command bar becomes 3 columns then 2;
- map remains above deep analytics;
- pass rail and comparison metrics do not overflow;
- disclosures are full-width touch targets;
- source URLs wrap.

Add:

```css
.stage-command-view,
.stage-command-view * { min-width: 0; }
.stage-disclosure-panel a,
.stage-command-view .sources a { overflow-wrap: anywhere; }
```

Do **not** add global `overflow-x: hidden` to mask mistakes.

- [ ] **Step 7: Run tests/build**

```bash
npm test -- src/presentation/stageCommandMotionContract.test.ts
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 8: Firefox visual checkpoint**

Check approximately 1440 px, 1024 px and 390 px widths plus reduced-motion preference.

Verify:

- no horizontal scroll;
- map labels remain legible;
- stage command bar remains readable;
- disclosures remain keyboard usable;
- motion does not delay content or imply live data.

- [ ] **Step 9: Commit**

```bash
git add src/presentation/stageCommandMotionContract.test.ts src/components/StageDetail.tsx src/stageCommandView.css src/styles.css src/passComparison.css
git commit -m "style: polish Stage Command View"
```

---

### Task 6: Final regression, README checkpoint and PR evidence

**Files:**
- Modify: `README.md`
- No domain-code changes expected.

- [ ] **Step 1: Run clean final verification**

```bash
npm install --no-package-lock
npm test
npm run build
```

If the repository tracks an npm lockfile at execution time, use the normal lockfile-respecting install command instead.

Expected:

- all previous 70 tests plus new presentation tests pass;
- TypeScript compile passes;
- Vite build passes;
- the only new runtime UI dependency is Motion.

The pre-existing Vite chunk-size warning is not scope for this task.

- [ ] **Step 2: Smoke-test all six Friday stages in Firefox**

```text
#/chile-2026/ss1-turquia
#/chile-2026/ss2-nuevo-rere
#/chile-2026/ss3-hualqui
#/chile-2026/ss4-turquia
#/chile-2026/ss5-nuevo-rere
#/chile-2026/ss6-hualqui
```

For each stage verify:

- stage identity/time/distance;
- geometry state;
- map high in the page;
- START/FINISH;
- 5 km labels where applicable;
- route arrows;
- environmental chips when weather is ready;
- correct forecast/historical-reference wording;
- official spatial points only where sourced;
- disclosures work with mouse and keyboard;
- no horizontal scroll.

- [ ] **Step 3: Verify repeated-pass integrity**

For SS1↔SS4, SS2↔SS5 and SS3↔SS6:

- rail indicator matches active pass;
- times remain correct;
- comparison appears only for comparable evidence modes;
- Pass 2 − Pass 1 values remain unchanged;
- temperature profile remains numerically unchanged;
- no road-condition inference appears.

- [ ] **Step 4: Verify SS1 simulation regression**

- open Simulation disclosure;
- verify opening alone does not start motion;
- use existing simulation control;
- verify ten generic P1 vehicles and existing timing behavior;
- verify vehicle animation remains MapLibre/requestAnimationFrame based.

- [ ] **Step 5: Add one compact README note**

Under `## What you see on a stage map` add:

```markdown
The stage detail uses a map-first command view: the route and operational status stay visible first, while node-by-node weather, safety timing, simulation details and provenance remain available in collapsible sections below.
```

Do not add another long design section.

- [ ] **Step 6: Run final tests/build after documentation change**

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit README checkpoint**

```bash
git add README.md
git commit -m "docs: describe Stage Command View"
```

- [ ] **Step 8: Verify final CI + Vercel head**

Verify final PR head has:

- GitHub Actions `CI` = `success`;
- actual final test count green;
- TypeScript/Vite build green;
- Vercel deployment = `success`.

Do not merge automatically; leave the PR open for visual approval.

- [ ] **Step 9: Update PR verification block with actual evidence**

Use actual final SHA/run/test count and include:

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

Do not copy the old `70/70` number after new tests are added; use the final CI count.

---

## Implementation Order Rationale

1. **Command bar first** removes duplicated status without touching scientific or map logic.
2. **Map-first order second** delivers the largest visible improvement with a small structural diff.
3. **Pass rail third** introduces Motion in one isolated interaction before it is reused.
4. **Disclosures fourth** reduce page length by wrapping existing content rather than relocating data ownership.
5. **Polish fifth** happens only after hierarchy is correct, so animation cannot hide layout problems.
6. **Regression last** protects all evidence and simulation behavior and leaves merge as a separate human decision.

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
- refactor the whole `StageDetail` state/domain layer.

Those are separate future tasks after Stage Command View is stable.