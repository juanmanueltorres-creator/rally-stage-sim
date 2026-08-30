# Map-first stage context and weather fallback — design

## Goal

Make each Rally Chile stage understandable at first glance without requiring clicks, while preserving the project's evidence rules. The map becomes the primary stage-reading surface: route, direction, distance references, operating context, selected environmental values and official spectator logistics appear by default. Weather must degrade gracefully from forecast to clearly labelled historical reference instead of leaving the experience empty.

## Product principle

The map should answer, without interaction:

1. Where does the stage start and finish?
2. Which direction does it run?
3. How far along the stage am I looking?
4. What environmental context changes along the route?
5. What operating/spectator information is currently known?
6. What is forecast, what is historical reference, and what is still unknown?

The design must not convert modelled weather into road-condition claims, reconstructed geometry into official GPS, or unofficial locations into spectator recommendations.

## Selected approach

Use the balanced map-density option approved by the user:

- START and FINISH always labelled.
- Distance labels every 5 km.
- Direction arrows distributed along the route.
- Three to five environmental chips chosen from representative route nodes.
- Compact stage-context strip over/above the map.
- Official spectator/access/parking points shown and labelled when spatially sourced.
- Unknown spectator geography remains absent from the map and explicit in the context strip.

Do not label every 2.5 km weather node by default. The existing 2.5 km sampling remains the analytical grid, while the visible map uses a smaller set of labels to preserve legibility.

## Map information hierarchy

### 1. Route geometry

The route remains the strongest visual element.

- Stage route: amber/copper line.
- START: high-contrast green marker with visible `START` label.
- FINISH: warm white/red marker with visible `FINISH` label.
- Direction: small repeated arrow symbols aligned to the route.
- Distance references: visible `KM 5`, `KM 10`, `KM 15`, etc., derived from route length rather than stored manually.

All distance-reference geometry is derived from the same LineString used by the stage map.

### 2. Stage context strip

A compact default-visible strip summarizes:

- schedule distance / technical distance when they disagree;
- scheduled first-car time;
- geometry confidence (`RECONSTRUCTED`, `VERIFIED`, or pending);
- weather mode (`FORECAST`, `HISTORICAL REFERENCE`, `TEMPORARILY UNAVAILABLE`);
- general closure rule when available;
- public-access spatial state (`OFFICIAL POINTS`, `PENDING OFFICIAL POINTS`).

The strip must not imply that a general closure rule is a stage-specific georeferenced access instruction.

### 3. Environmental chips

The app keeps the existing START → 2.5 km nodes → FINISH analytical sampling, but only a representative subset is labelled directly on the map.

Default chip selection:

- START;
- approximately 25% of route distance;
- approximately 50%;
- approximately 75%;
- FINISH.

When space is constrained, START / midpoint / FINISH are the minimum visible set.

A chip may show compact values such as:

- `KM 10 · 14 °C`
- `KM 15 · GUST 28`
- `KM 20 · 410 m`

The primary value shown should favor the most decision-useful available signal in this order:

1. temperature;
2. gust;
3. precipitation;
4. elevation.

Detailed values remain available in the existing environmental panel; map chips are summaries, not replacements.

### 4. Spectator and access information

Only spatially sourced official/organizer information may produce spectator-related markers.

Supported visible map classes:

- `OFFICIAL SPECTATOR ZONE` — green;
- `OFFICIAL PARKING` — amber;
- `OFFICIAL ACCESS` — cyan;
- `PROHIBITED / NO SPECTATOR` — red, only when official geometry or coordinates exist.

Every such point/area must include source provenance in the data contract.

No `best viewing spot`, `recommended corner`, parking suggestion or access shortcut may be inferred from road geometry, imagery, community comments or model output.

When no official point is available, the map shows no fabricated marker and the context strip says `PUBLIC ACCESS · PENDING OFFICIAL POINTS`.

## Weather state model

Weather becomes an explicit data-state pipeline rather than a single forecast request.

### States

`forecast` — Open-Meteo forecast contains the target stage date and required variables.

`historical-reference` — target date is outside forecast availability, so the app loads a historical reference for the same route nodes and comparable calendar period.

`unavailable` — neither source can be loaded; route/elevation/context remain usable and weather values remain unknown.

`loading` — a weather source is being resolved.

### Source priority

1. Forecast for the scheduled stage date/time.
2. Historical reference for the same route nodes when forecast is unavailable because of horizon.
3. Explicit unavailable state when both fail.

The app must not silently switch source types. The active mode is always visible in the stage facts, map strip, node cards and provenance.

### Historical reference definition

V1 historical reference uses Open-Meteo Historical Weather API data from previous years for the same calendar window and local stage hour at the same sampled route nodes.

The implementation should aggregate multiple prior years rather than present one arbitrary prior date as “normal”. The initial target is a small deterministic year set sufficient for a useful reference while keeping browser/API load modest.

Required historical fields mirror the forecast fields where available:

- temperature at 2 m;
- wind speed at 10 m;
- wind direction at 10 m;
- wind gusts at 10 m;
- precipitation;
- elevation/context when provided or already known.

Historical reference is labelled `HISTORICAL REFERENCE`, never `forecast`, `expected weather`, `normal`, or `observation`.

### Pass 1 ↔ Pass 2 comparison

Pass comparison remains enabled only when both passes use comparable source modes.

Allowed:

- forecast ↔ forecast;
- historical-reference ↔ historical-reference using the same historical methodology.

Do not compare forecast ↔ historical-reference as if the delta represented the planned day.

If modes differ, the comparison panel explains that two comparable weather states are not available.

## Route-derived map annotations

Create pure utilities that derive annotations from the stage LineString:

- 5 km distance markers;
- representative chip nodes;
- arrow anchor positions and bearings;
- START/FINISH labels.

No annotation coordinate is manually hardcoded per stage.

The utilities must tolerate short stages:

- stages under 5 km: no intermediate 5 km markers;
- stages with too little room for five chips: reduce density deterministically;
- missing geometry: no derived annotations.

## Map rendering

Continue using the existing single `stage-context` GeoJSON source where practical so route, markers, environment and simulation stay synchronized.

Add feature kinds for derived annotations, for example:

- `distance-marker`;
- `direction-arrow`;
- `environment-chip`;
- `official-access`;
- `no-spectator-zone` when sourced.

Use MapLibre symbol layers for labels/arrows and existing circle/line layers for points and route. Labels must have halos/background contrast sufficient over the muted OSM raster.

Simulation vehicles remain above route/context layers.

## Data contracts

Extend environment state so every snapshot/result includes source metadata, at minimum:

- mode: `forecast | historical-reference`;
- valid/local reference time;
- source label;
- methodology note for historical reference.

Spectator spatial objects should support a category beyond the current zone/parking types so official access and prohibited areas can be represented without overloading existing semantics.

No unsourced object receives `official` status.

## User-visible wording

Examples:

- `FORECAST · OPEN-METEO`
- `HISTORICAL REFERENCE · OPEN-METEO`
- `WEATHER TEMPORARILY UNAVAILABLE`
- `PUBLIC ACCESS · PENDING OFFICIAL POINTS`
- `GEOMETRY · RECONSTRUCTED`

Historical-mode explanatory text:

> Reference derived from previous years for a comparable calendar period and local stage hour. It is not a forecast or an observation for rally day.

Road-state disclaimer remains:

> Modelled or historical weather context does not establish grip, mud, dust or actual road condition.

## Error handling

- Forecast outside horizon must not be treated as an application error if historical reference succeeds.
- Forecast network failure may attempt historical fallback, but the UI must identify the resulting mode.
- Historical API failure leaves weather unavailable without hiding the route.
- Missing optional map annotation data cannot prevent map rendering.
- Missing official spectator points cannot prevent stage rendering.
- No failed layer should hide the route, START or FINISH.

## Testing strategy

Use TDD for each block.

Pure unit tests:

- 5 km marker generation and short-stage behavior;
- representative environmental-chip selection;
- direction-arrow positions/bearings;
- historical URL/query generation;
- historical response normalization/aggregation;
- weather-source state selection;
- pass comparison refuses mixed source modes;
- official spectator category normalization.

Map contract tests:

- GeoJSON contains route + START/FINISH + 5 km markers + arrows + visible environmental chips;
- missing weather still preserves structural annotations;
- unsourced spectator recommendations cannot become map features.

Integration/build guards:

- existing MapLibre Vite worker setup remains intact;
- full test suite green;
- TypeScript build green;
- Vite production build green;
- Vercel preview inspected in Firefox after deployment.

## Increment scope

### In this increment

- visible START/FINISH labels;
- 5 km labels;
- direction arrows;
- balanced 3–5 environmental chips;
- compact default-visible map context strip;
- historical weather fallback with explicit mode;
- weather mode propagated through stage summary and provenance;
- official access/spectator categories supported when sourced;
- pass comparison guarded against mixed weather modes;
- tests and production preview verification.

### Not in this increment

- inferred “best spectator spots”;
- unofficial shortcuts or parking;
- grip/mud/dust prediction;
- road-condition classification;
- live WRC timing;
- push alerts;
- backend persistence;
- automatic scraping of future spectator guides;
- satellite-derived road-condition inference.

## Success criteria

A first-time visitor opening a stage should understand the route direction, distance scale, scheduled time, weather/source mode, environmental variation and public-access information state from the map area alone, without clicking a marker or opening another panel.

The map remains legible on desktop and mobile, and every stronger claim is traceable to a source or explicitly marked as reconstructed/modelled/historical/pending.