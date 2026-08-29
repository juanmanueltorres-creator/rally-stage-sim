# Chile 2026 Foundation Design

## Goal

Build the smallest durable foundation for an unofficial rally stage simulator, using Rally Chile Bio Bío 2026 as the first event dataset.

## Scope

V0 contains:

- React + TypeScript + Vite frontend.
- MapLibre map shell centered on the Biobío region.
- Typed event and stage contracts.
- One verified stage metadata record for SS1 Turquía.
- A pure simulation progress function with tests.
- Explicit provenance and estimate/observed status fields.

V0 does not contain:

- Backend, authentication, Supabase or PostGIS.
- Live WRC API calls from the browser.
- Weather requests.
- Driver prediction models.
- Invented stage geometry.
- GPS or telemetry.

## Data integrity

Stage metadata may be stored only when supported by a named source. Route geometry must remain absent until a trustworthy geometry source is verified. The UI must distinguish planned, simulated and observed values.

Initial verified metadata:

- Event: WRC Rally Chile Bio Bío 2026.
- Event dates: 2026-09-10 through 2026-09-13.
- SS1: Turquía.
- Distance: 22.94 km.
- First competition start on Friday 2026-09-11: 08:53 local time.
- Surface: gravel, as described by WRC route material.

## Architecture

Static data lives under `public/data/chile-2026/`. Domain contracts live under `src/domain/`. Pure simulation logic lives under `src/simulation/` and has no React or MapLibre dependency. The map component only renders verified geometry; when geometry is unavailable it renders the regional context and a clear pending-geometry state.

## Simulation contract

`stageProgress(elapsedSeconds, expectedDurationSeconds)` returns a normalized value from 0 to 1. It clamps negative elapsed time to 0, clamps elapsed time beyond the expected duration to 1, and rejects non-positive expected duration.

This function will later feed Turf-based interpolation once verified stage LineStrings are available.

## UI

The initial screen shows:

- Event identity and date.
- SS1 Turquía metadata.
- Source/provenance status.
- A MapLibre map centered on Biobío.
- A clear notice that route geometry is pending verification.

No fake route is drawn.

## Legal / branding

The project is unofficial, open source and not affiliated with FIA, WRC Promoter GmbH or event organizers. WRC names are used only to identify public sporting events and sourced data.

## Quality gate

- Pure simulation behavior is test-first.
- `npm test` must pass.
- `npm run build` must pass before merging.
- No credentials or API keys are committed.
