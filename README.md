# rally-stage-sim

Open-source rally stage simulator with animated vehicles, timing, weather and terrain context on interactive maps.

> Unofficial project for research, education and visualization. Not affiliated with FIA, WRC Promoter GmbH or event organizers.

## First scenario

**WRC Rally Chile Bio Bío 2026** is the first dataset. V0 focuses on SS1 Turquía and keeps source provenance beside every planned or simulated value.

Current V0:

- Event: 10–13 September 2026.
- SS1 Turquía 1: 22.94 km official distance.
- Planned first competition slot: 11 September 2026 at 08:53 local time.
- Geometry state: `reconstructed`.
- Reference LineString: ~22.90 km, map-matched from OpenStreetMap road centerlines against the organizer's PE1 Turquía competition map.
- Ten generic simulated P1 vehicles share one virtual stage clock.
- Planning start grid: SIM-01 through SIM-10 at 180-second intervals, visualized at 60× playback speed.
- The published Rally Chile 2026 entry list confirms ten RC1/Rally1 P1 crews; those official entries are displayed separately from the simulated start slots.
- Entry-list order is **not** treated as the official SS1 running order. An official start list, event-specific instructions or Live TV intervals override the planning model.
- Motion benchmark: 13:46.4 from the local Rally2 PE1 winner on Turquía. It is used only to validate movement, not as a WRC Rally1 pace forecast.
- Explicit START and FINISH markers plus context nodes every 2.5 km along the reference route.
- Client-side Open-Meteo context for the planned stage start: temperature, 10 m wind, gusts, precipitation and returned location elevation.
- The forecast request explicitly enables the 16-day horizon so the pre-event Chile scenario remains inside the documented forecast window.
- The first map view intentionally contains no place-name labels.

The reconstructed route is **not an official GPS trace**, the simulated start grid is **not an official running order**, and the motion benchmark is **not a WRC Rally1 forecast**.

The 2.5 km node spacing is a visualization sampling interval. It does **not** claim 2.5 km meteorological resolution, and Open-Meteo values are modelled context rather than local station observations.

If the forecast is outside the available model horizon or the external API is unavailable, the route, markers, nodes and fleet simulation continue to work without weather values.

## Data rule

The simulator distinguishes three states:

- `planned` — schedule, entry or other pre-event information from a named source.
- `simulated` — values generated or replayed by our model.
- `observed` — recorded timing, split or telemetry-like information.

Unknown values stay unknown. Reconstructed geometry stays explicitly different from verified geometry. Modelled environmental context stays explicitly different from observations. Entry lists stay explicitly different from start lists.

## Stack

- React 19
- TypeScript
- Vite
- MapLibre GL
- Turf.js
- Open-Meteo Weather Forecast API
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

Vehicle movement stays deliberately small and replaceable:

`stageProgress → positionAlongLine → vehicleSnapshot`

The fleet layer adds scheduling without duplicating movement logic:

`buildPlannedStartGrid → fleetSnapshot → buildStageGeoJson → MapLibre`

Environmental context follows a separate path:

`buildRouteNodes → Open-Meteo multi-location request → normalize forecast → presentation view`

That separation lets a later official start-list adapter replace generic SIM slots, a timing/split adapter replace simulated progress, or a different environmental source replace Open-Meteo without rewriting the map UI.

## Sources

Source URLs and access dates are stored inside the static rally dataset where applicable. Current route and context sources include:

- WRC Rally Chile Bio Bío 2026 route announcement for event/stage context.
- Rally Chile Bio Bío 2026 official entry list for the ten RC1/Rally1 P1 crews.
- FIA 2026 WRC Sporting Regulations, section 41.3, for start-interval rules. The V0 180-second P1 interval is a planning assumption and not an event-issued start time.
- ANARE / Copec RallyMobil Nacimiento–Negrete 2026 PE1 Turquía competition map for route shape validation.
- OpenStreetMap road centerlines under ODbL 1.0 for the reference LineString.
- ANARE PE1 timing results for the motion-only benchmark.
- Open-Meteo Weather Forecast API for modelled environmental context requested at runtime.

## License

Code is MIT licensed. External data remains subject to the terms of its original source. OpenStreetMap-derived geometry requires ODbL attribution.
