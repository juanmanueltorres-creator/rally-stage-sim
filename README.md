# rally-stage-sim

Open-source rally stage simulator with animated vehicles, timing, weather and terrain context on interactive maps.

> Unofficial project for research, education and visualization. Not affiliated with FIA, WRC Promoter GmbH or event organizers.

## First scenario

**WRC Rally Chile Bio Bío 2026** is the first dataset. V0 focuses on SS1 Turquía and keeps source provenance beside every planned or simulated value.

Current V0:

- Event: 10–13 September 2026.
- SS1 Turquía 1: 22.94 km official distance.
- Planned first competition start: 11 September 2026 at 08:53 local time.
- Geometry state: `reconstructed`.
- Reference LineString: ~22.90 km, map-matched from OpenStreetMap road centerlines against the organizer's PE1 Turquía competition map.
- One simulated vehicle moves along the reconstructed route.
- Motion benchmark: 13:46.4 from the local Rally2 PE1 winner on Turquía, visualized at 60× playback speed.
- The first map view intentionally contains no place-name labels.

The reconstructed route is **not an official GPS trace**, and the motion benchmark is **not a WRC Rally1 forecast**.

## Data rule

The simulator distinguishes three states:

- `planned` — schedule or pre-event information from a named source.
- `simulated` — values generated or replayed by our model.
- `observed` — recorded timing, split or telemetry-like information.

Unknown values stay unknown. Reconstructed geometry stays explicitly different from verified geometry.

## Stack

- React 19
- TypeScript
- Vite
- MapLibre GL
- Turf.js
- Static JSON snapshots

No backend, database, login or paid API is required for V0.

## Development

```bash
npm install
npm test
npm run dev
npm run build
```

## Architecture

The current motion path is deliberately small and replaceable:

`stageProgress → positionAlongLine → vehicleSnapshot → buildStageGeoJson → MapLibre`

That lets a later real timing/split adapter replace simulated progress without rewriting the map UI.

## Sources

Source URLs and access dates are stored inside the dataset. Current route reconstruction combines:

- WRC Rally Chile Bio Bío 2026 route announcement for event/stage context.
- ANARE / Copec RallyMobil Nacimiento–Negrete 2026 PE1 Turquía competition map for route shape validation.
- OpenStreetMap road centerlines under ODbL 1.0 for the reference LineString.
- ANARE PE1 timing results for the motion-only benchmark.

## License

Code is MIT licensed. External data remains subject to the terms of its original source. OpenStreetMap-derived geometry requires ODbL attribution.
