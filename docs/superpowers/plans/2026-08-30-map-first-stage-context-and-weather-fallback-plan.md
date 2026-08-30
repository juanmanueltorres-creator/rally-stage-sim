# Map-first Stage Context and Weather Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each Friday stage understandable from the map alone, with route direction/distance annotations, default-visible operational context, and a forecast→historical-reference weather fallback that never blurs source types.

**Architecture:** Keep the existing single MapLibre stage-context source, but derive static route annotations from the LineString and enrich the source with a small representative set of environmental labels. Introduce a weather dataset wrapper that resolves forecast first and then a deterministic 2021–2025 Open-Meteo historical reference; StageDetail and RallyMap consume the same dataset metadata so labels, summaries, pass comparisons, and provenance stay consistent.

**Tech Stack:** React 19, TypeScript, Vite, MapLibre GL 6, Turf 7, Open-Meteo Forecast API, Open-Meteo Historical Weather API.

**Spec:** `docs/superpowers/specs/2026-08-29-map-first-stage-context-and-weather-fallback-design.md`

## Global Constraints

- START and FINISH must be visible without interaction.
- Distance labels are derived every 5 km; no manual per-stage coordinates.
- Direction arrows are derived from the same LineString used by the stage route.
- Only 3–5 environmental chips are visible by default; the 2.5 km analytical sampling remains unchanged.
- Weather source priority is forecast → historical-reference → unavailable.
- Historical reference is exactly 2021–2025, same calendar date and nearest local stage hour, median per node/variable, minimum three valid years.
- Historical wind direction remains unavailable in V1; do not apply linear statistics to circular degrees.
- Pass comparison is valid only for forecast↔forecast or historical-reference↔historical-reference using the same methodology.
- No inferred best spectator spots, unofficial parking, access shortcuts, grip, mud, dust, or road-condition claims.
- Official spectator/access geography may render only when spatially sourced.
- Keep the MapLibre Vite worker safeguards already in `vite.config.ts` and `src/main.tsx`.
- Final verification requires full tests, TypeScript build, Vite production build, and Vercel Firefox inspection.

---

### Task 1: Derive route annotations from the LineString

**Files:**
- Create: `src/map/routeAnnotations.ts`
- Test: `src/map/routeAnnotations.test.ts`
- Modify: `src/map/stageGeoJson.ts`
- Modify: `src/map/stageGeoJson.test.ts`

**Interfaces:**
- Consumes: `StageLineString`, existing Turf route geometry.
- Produces:
  - `buildDistanceMarkers(line: StageLineString, spacingKm?: number): RouteDistanceMarker[]`
  - `buildDirectionArrows(line: StageLineString, targetCount?: number): RouteDirectionArrow[]`
  - `selectRepresentativeNodes(nodes: RouteNode[], maxCount?: number): RouteNode[]`
  - `buildStageGeoJson(..., annotations?: StageMapAnnotations)` with feature kinds `distance-marker`, `direction-arrow`, and later `environment-chip`.

- [ ] **Step 1: Write failing tests for 5 km markers, short stages, arrows, and representative nodes**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDirectionArrows, buildDistanceMarkers, selectRepresentativeNodes } from './routeAnnotations.ts'

const line = {
  type: 'LineString' as const,
  coordinates: [[-73, -37], [-72.7, -37]],
}

test('buildDistanceMarkers emits derived 5 km references but no marker at START/FINISH', () => {
  const markers = buildDistanceMarkers(line, 5)
  assert.ok(markers.length > 0)
  assert.equal(markers[0].label, 'KM 5')
  assert.ok(markers.every((marker) => marker.distanceKm > 0))
})

test('buildDistanceMarkers returns no intermediate markers for a route shorter than spacing', () => {
  const short = { type: 'LineString' as const, coordinates: [[-72.7, -37], [-72.69, -37]] }
  assert.deepEqual(buildDistanceMarkers(short, 5), [])
})

test('buildDirectionArrows returns route-aligned anchors with finite bearings', () => {
  const arrows = buildDirectionArrows(line, 4)
  assert.ok(arrows.length >= 2)
  assert.ok(arrows.every((arrow) => Number.isFinite(arrow.bearingDeg)))
})

test('selectRepresentativeNodes keeps START, middle context and FINISH without labelling every analytical node', () => {
  const nodes = Array.from({ length: 11 }, (_, index) => ({
    id: `n-${index}`,
    role: index === 0 ? 'start' as const : index === 10 ? 'finish' as const : 'context' as const,
    distanceKm: index * 2.5,
    coordinate: [-72.7 + index * 0.01, -37] as [number, number],
  }))
  const selected = selectRepresentativeNodes(nodes, 5)
  assert.equal(selected.length, 5)
  assert.equal(selected[0].role, 'start')
  assert.equal(selected.at(-1)?.role, 'finish')
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/map/routeAnnotations.test.ts`

Expected: FAIL because `routeAnnotations.ts` does not exist.

- [ ] **Step 3: Implement the pure annotation utilities**

Use Turf `length`, `along`, and `bearing`. Distance markers are at 5, 10, 15… km strictly before route end. Direction arrows use evenly distributed fractions excluding the exact endpoints. Representative nodes choose nearest nodes to 0%, 25%, 50%, 75%, 100%, then de-duplicate and cap deterministically.

```ts
export interface RouteDistanceMarker {
  distanceKm: number
  label: string
  coordinate: [number, number]
}

export interface RouteDirectionArrow {
  coordinate: [number, number]
  bearingDeg: number
}
```

- [ ] **Step 4: Extend `buildStageGeoJson` with structural annotations**

Add `StageMapAnnotations`:

```ts
export interface StageMapAnnotations {
  distanceMarkers: RouteDistanceMarker[]
  directionArrows: RouteDirectionArrow[]
  environmentChips: StageMapEnvironmentChip[]
}
```

Add kinds `distance-marker`, `direction-arrow`, `environment-chip`; preserve route, simulation, START/FINISH, and spectator features.

- [ ] **Step 5: Add/adjust GeoJSON contract tests**

Require route + START/FINISH + derived markers/arrows even when weather chips are empty.

- [ ] **Step 6: Run focused tests and full suite**

Run: `npm test -- src/map/routeAnnotations.test.ts src/map/stageGeoJson.test.ts && npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/map/routeAnnotations.ts src/map/routeAnnotations.test.ts src/map/stageGeoJson.ts src/map/stageGeoJson.test.ts
git commit -m "feat: derive route annotations for stage maps"
```

---

### Task 2: Add deterministic 2021–2025 historical weather reference

**Files:**
- Create: `src/map/historicalWeather.ts`
- Test: `src/map/historicalWeather.test.ts`
- Modify: `src/map/openMeteo.ts`

**Interfaces:**
- Consumes: `RouteNode[]`, scheduled ISO time, timezone.
- Produces:
  - `buildHistoricalWeatherUrl(nodes, targetIso, timezone, year): string`
  - `normalizeHistoricalYear(nodes, payload, targetIsoForYear): RouteEnvironmentSnapshot[]`
  - `aggregateHistoricalReference(yearlySnapshots): RouteEnvironmentSnapshot[]`
  - `fetchHistoricalReference(nodes, targetIso, timezone, fetcher?): Promise<RouteEnvironmentSnapshot[]>`

Historical requests use `https://archive-api.open-meteo.com/v1/archive`, one multi-location one-day request per year, `models=era5_seamless`, and hourly variables matching the forecast request.

- [ ] **Step 1: Write RED tests for URL generation and the five-year methodology**

```ts
test('buildHistoricalWeatherUrl targets one historical year with the same month/day and timezone', () => {
  const url = new URL(buildHistoricalWeatherUrl(nodes, '2026-09-11T08:53:00-03:00', 'America/Santiago', 2023))
  assert.equal(url.hostname, 'archive-api.open-meteo.com')
  assert.equal(url.searchParams.get('start_date'), '2023-09-11')
  assert.equal(url.searchParams.get('end_date'), '2023-09-11')
  assert.equal(url.searchParams.get('timezone'), 'America/Santiago')
  assert.equal(url.searchParams.get('models'), 'era5_seamless')
})

test('aggregateHistoricalReference uses the median when at least three years are valid', () => {
  const result = aggregateHistoricalReference([
    snapshotsAt(10, 20, 0),
    snapshotsAt(12, 22, 1),
    snapshotsAt(14, 24, 2),
    snapshotsAt(16, 26, 3),
    snapshotsAt(18, 28, 4),
  ])
  assert.equal(result[0].temperatureC, 14)
  assert.equal(result[0].windGustKmh, 24)
  assert.equal(result[0].windDirectionDeg, null)
})

test('aggregateHistoricalReference keeps a variable unavailable with fewer than three valid years', () => {
  // three nulls + two finite values => null
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- src/map/historicalWeather.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement median aggregation with a minimum-three rule**

```ts
function median(values: number[]): number | null {
  if (values.length < 3) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}
```

Aggregate temperature, wind speed, gust, precipitation, and elevation; set aggregated `windDirectionDeg` to `null`.

- [ ] **Step 4: Implement five historical requests**

Use years `[2021, 2022, 2023, 2024, 2025]`. Each request is one date and all nodes. Preserve the route nodes from the current stage; do not infer new coordinates from the historical API response.

- [ ] **Step 5: Run focused tests and full suite**

Run: `npm test -- src/map/historicalWeather.test.ts src/map/openMeteo.test.ts && npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/map/historicalWeather.ts src/map/historicalWeather.test.ts src/map/openMeteo.ts
git commit -m "feat: add historical weather reference"
```

---

### Task 3: Resolve weather source mode explicitly

**Files:**
- Create: `src/map/stageEnvironment.ts`
- Test: `src/map/stageEnvironment.test.ts`
- Modify: `src/map/weatherComparison.ts`
- Modify: `src/map/weatherComparison.test.ts`

**Interfaces:**
- Produces:

```ts
export type WeatherMode = 'forecast' | 'historical-reference'

export interface RouteEnvironmentDataset {
  mode: WeatherMode
  snapshots: RouteEnvironmentSnapshot[]
  sourceLabel: string
  methodologyNote?: string
}

export async function fetchStageEnvironment(
  nodes: RouteNode[],
  targetIso: string,
  timezone: string,
  deps?: { forecast?: typeof fetchOpenMeteoForecast; historical?: typeof fetchHistoricalReference },
): Promise<RouteEnvironmentDataset>

export function weatherModesComparable(a: WeatherMode, b: WeatherMode): boolean
```

- [ ] **Step 1: Write RED tests for source priority**

```ts
test('fetchStageEnvironment returns forecast without calling historical fallback when forecast succeeds', async () => {
  let historicalCalls = 0
  const result = await fetchStageEnvironment(nodes, targetIso, timezone, {
    forecast: async () => forecastSnapshots,
    historical: async () => { historicalCalls += 1; return historicalSnapshots },
  })
  assert.equal(result.mode, 'forecast')
  assert.equal(historicalCalls, 0)
})

test('fetchStageEnvironment returns historical-reference when forecast is unavailable', async () => {
  const result = await fetchStageEnvironment(nodes, targetIso, timezone, {
    forecast: async () => { throw new Error('outside horizon') },
    historical: async () => historicalSnapshots,
  })
  assert.equal(result.mode, 'historical-reference')
})
```

- [ ] **Step 2: Run RED test**

Run: `npm test -- src/map/stageEnvironment.test.ts`

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement source resolution and labels**

Forecast label: `FORECAST · OPEN-METEO`.
Historical label: `HISTORICAL REFERENCE · 2021–2025`.
Historical methodology note exactly states median/same-date/same-local-hour/minimum-three and that it is not forecast, climate normal, or rally-day observation.

- [ ] **Step 4: Guard pass comparison against mixed modes**

Add:

```ts
export function weatherModesComparable(a: WeatherMode, b: WeatherMode): boolean {
  return a === b
}
```

StageDetail will use this before computing deltas; `weatherComparison.ts` stays numerical and source-agnostic.

- [ ] **Step 5: Run focused tests and full suite**

Run: `npm test -- src/map/stageEnvironment.test.ts src/map/weatherComparison.test.ts && npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/map/stageEnvironment.ts src/map/stageEnvironment.test.ts src/map/weatherComparison.ts src/map/weatherComparison.test.ts
git commit -m "feat: resolve stage weather source mode"
```

---

### Task 4: Render a default-visible map intelligence layer

**Files:**
- Modify: `src/components/RallyMap.tsx`
- Create: `src/components/StageMapContextStrip.tsx`
- Modify: `src/components/StageDetail.tsx`
- Modify: `src/styles.css`
- Modify: `src/map/stageGeoJson.ts`
- Test: `src/map/stageGeoJson.test.ts`

**Interfaces:**
- RallyMap receives `RouteEnvironmentDataset | null` instead of treating all snapshots as forecast.
- `StageMapContextStrip` receives stage distance display, scheduled time, geometry status, weather mode/status, closure text/time, and public-access state.
- `StageMapEnvironmentChip` properties include label/value/source mode but no click requirement.

- [ ] **Step 1: Write RED GeoJSON test for visible environmental chips**

```ts
test('stage GeoJSON includes representative environment chips without labelling every 2.5 km node', () => {
  const collection = buildStageGeoJson(line, [], 'reconstructed', nodes, spectator, annotations)
  const chips = collection.features.filter((feature) => feature.properties.kind === 'environment-chip')
  assert.ok(chips.length >= 3 && chips.length <= 5)
})
```

- [ ] **Step 2: Add MapLibre symbol layers**

Add layers after route and before simulated vehicle:

```ts
map.addLayer({
  id: 'distance-labels',
  type: 'symbol',
  source: 'stage-context',
  filter: ['==', ['get', 'kind'], 'distance-marker'],
  layout: { 'text-field': ['get', 'label'], 'text-size': 11 },
  paint: { 'text-color': '#f4efe5', 'text-halo-color': '#071017', 'text-halo-width': 2 },
})
```

Create analogous symbol layers for `START`/`FINISH`, direction arrows, and environmental chips. Use text/Unicode arrow glyphs rather than external icons to avoid a new asset pipeline.

- [ ] **Step 3: Build representative environment chips from the active dataset**

For the representative nodes selected in Task 1, display compact values in this order: temperature → gust → precipitation → elevation. If weather is unavailable but elevation exists, elevation may still label the selected node. Never display a fake zero.

- [ ] **Step 4: Add default-visible context strip**

Render above the map canvas:

`DISTANCE · START TIME · GEOMETRY · WEATHER MODE · CLOSURE · PUBLIC ACCESS`

On narrow screens, allow horizontal wrapping rather than hiding fields.

- [ ] **Step 5: Keep animation source updates synchronized**

When `source.setData(...)` runs during simulation, rebuild GeoJSON with the same static annotations + current environmental chips so the route labels never disappear when cars move.

- [ ] **Step 6: Run tests and build**

Run: `npm test && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/RallyMap.tsx src/components/StageMapContextStrip.tsx src/components/StageDetail.tsx src/styles.css src/map/stageGeoJson.ts src/map/stageGeoJson.test.ts
git commit -m "feat: surface stage intelligence directly on map"
```

---

### Task 5: Propagate weather mode through StageDetail and pass comparison

**Files:**
- Modify: `src/components/StageDetail.tsx`
- Modify: `src/components/RallyMap.tsx`
- Modify: `src/presentation/stageExperience.ts`
- Modify: `src/presentation/stageExperience.test.ts`

**Interfaces:**
- StageDetail stores `currentDataset: RouteEnvironmentDataset | null` and `otherDataset: RouteEnvironmentDataset | null`.
- Existing summaries still consume `dataset.snapshots`.
- `comparisonStatus` is ready only if both datasets exist and `weatherModesComparable(current.mode, other.mode)`.

- [ ] **Step 1: Write RED presentation test for historical wording**

```ts
test('historical reference wording never describes the data as forecast or observation', () => {
  const lines = describeStageConditions(summary, 'historical-reference')
  assert.ok(lines.some((line) => /referencia histórica/i.test(line)))
  assert.ok(lines.every((line) => !/pronóstico para el día|observado/i.test(line)))
})
```

- [ ] **Step 2: Switch RallyMap fetch from `fetchOpenMeteoForecast` to `fetchStageEnvironment`**

Status flow remains `idle | loading | ready | unavailable`; ready now carries dataset mode.

- [ ] **Step 3: Switch other-pass fetch to the same resolver**

Do not duplicate fallback logic inside StageDetail.

- [ ] **Step 4: Refuse mixed-mode pass deltas**

When modes differ, show: `No hay dos estados meteorológicos comparables para estos horarios.` and do not render numeric deltas/profile.

- [ ] **Step 5: Update source labels and provenance copy**

Node panel heading and stage fact must show the active mode. Historical mode copy must say: `Reference derived from 2021–2025 values for the same calendar day and local stage hour. Median per node/variable; minimum three valid years. It is not a forecast, climate normal or rally-day observation.`

- [ ] **Step 6: Run full test/build**

Run: `npm test && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/StageDetail.tsx src/components/RallyMap.tsx src/presentation/stageExperience.ts src/presentation/stageExperience.test.ts
git commit -m "feat: propagate weather evidence mode through stage views"
```

---

### Task 6: Extend official spectator map categories without inventing locations

**Files:**
- Modify: `src/domain/rally.ts`
- Modify: `src/domain/spectator.ts`
- Modify: `src/domain/spectator.test.ts`
- Modify: `src/map/stageGeoJson.ts`
- Modify: `src/map/stageGeoJson.test.ts`
- Modify: `src/components/RallyMap.tsx`

**Interfaces:**
- `StageSpectatorInfo` gains `accessPoints: SpectatorPoint[]` and `noSpectatorZones: SpectatorPoint[]`.
- Map kinds gain `official-access` and `no-spectator-zone`.
- Empty arrays are valid and expected until spatial official data exists.

- [ ] **Step 1: Write RED normalization test**

Require missing new categories to normalize to empty arrays, and require only points with coordinates to become map features.

- [ ] **Step 2: Extend domain contracts and normalizer**

Do not migrate existing pending data into new arrays. Current SS1/SS2/SS3 remain empty until official coordinates are sourced.

- [ ] **Step 3: Add map layers**

Official access: cyan label/marker. No-spectator: red label/marker. Render labels by default when present.

- [ ] **Step 4: Run focused tests and full suite**

Run: `npm test -- src/domain/spectator.test.ts src/map/stageGeoJson.test.ts && npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/rally.ts src/domain/spectator.ts src/domain/spectator.test.ts src/map/stageGeoJson.ts src/map/stageGeoJson.test.ts src/components/RallyMap.tsx
git commit -m "feat: support sourced access and no-spectator map points"
```

---

### Task 7: Documentation, regression guards, and production verification

**Files:**
- Modify: `README.md`
- Modify: PR #1 description after final SHA is known.

**Interfaces:** None; verification/documentation only.

- [ ] **Step 1: Run full verification from a fresh install state**

Run:

```bash
npm install
npm test
npm run build
```

Expected: all tests PASS; TypeScript and Vite production build PASS; MapLibre worker emitted as a bundled `.js` asset rather than raw `.mjs`.

- [ ] **Step 2: Inspect build output**

Confirm output includes a worker asset such as `dist/assets/maplibre-gl-worker-*.js` and does not regress the Firefox MIME fix.

- [ ] **Step 3: Update README**

Document:
- visible map annotations;
- weather source state model;
- 2021–2025 median historical-reference methodology;
- explicit non-climatology/non-observation disclaimer;
- official-only spectator geography rule.

- [ ] **Step 4: Wait for Vercel preview to become Ready for the exact head SHA**

Verify GitHub/Vercel checks refer to the same final commit.

- [ ] **Step 5: Firefox manual acceptance**

Open SS1 Turquía and verify without clicks:
- route visible;
- START/FINISH labels visible;
- 5 km labels visible;
- direction arrows visible;
- 3–5 context chips visible;
- context strip visible;
- weather source mode visible;
- no `maplibre-gl-worker.mjs` MIME error;
- simulation still renders above route when opened.

- [ ] **Step 6: Update PR #1 verification text**

Use the exact final head SHA and exact test count from CI. Keep PR open; do not merge.

- [ ] **Step 7: Final status check**

Confirm PR state `open`, `merged=false`, and current head matches the verified/deployed SHA.
