# rally-stage-sim

Open-source **Stage Intelligence** experiment for understanding a rally stage as route + time + environmental context + access rules, with simulation as an optional secondary layer.

> Unofficial project for research, education and visualization. Not affiliated with FIA, WRC Promoter GmbH or event organizers.

## First scenario

**WRC Rally Chile Bio Bío 2026** is the first dataset. The current version exposes the full 16-stage rally schedule and uses SS1 Turquía as the first interactive stage brief.

Current scenario:

- Event: 10–13 September 2026.
- Full schedule snapshot: 16 competitive stages / 311.70 km.
- SS1 Turquía 1: 22.94 km official distance.
- Planned first competition slot: 11 September 2026 at 08:53 local time.
- Geometry state: `reconstructed`.
- Reference LineString: ~22.90 km, map-matched from OpenStreetMap road centerlines against the organizer's PE1 Turquía competition map.
- Shareable stage route: `#/chile-2026/ss1-turquia`.
- First-visit editorial intro explains why a line on a map is not enough to understand a stage operationally.
- Route-wide Open-Meteo context summarizes temperature, wind/gusts, precipitation signal and elevation from the same sampled nodes shown on the map.
- Stage-condition copy reports modelled signals without claiming observed grip, mud, dust or road state.
- Spectator/access information is modelled separately from route geometry so partially known operational information stays explicit.
- Ten generic simulated P1 vehicles remain available as an optional layer, not as the primary user experience.

## Spectator and access integrity

The current SS1 spectator snapshot contains **event-level rules that are already published** while keeping exact SS1 access geometry pending.

Known operational rules loaded for SS1:

- General road closure: 20:00 on the day before the stage; for SS1 this corresponds to 10 September 2026 at 20:00 local time.
- Access may close earlier when spectator capacity is reached.
- Spectator exit is only in the direction of competition and after the `Rastrillo` authorizes reopening.
- Published safety-train offsets are represented relative to the planned first-car time:
  - safety vehicles: T−110 min;
  - Auto 000: T−50 min;
  - FIA car: T−35 min;
  - Auto 00: T−20 min;
  - Auto 0: T−10 min.

Still pending official publication for SS1:

- exact spectator-zone coordinates;
- exact parking coordinates;
- exact spectator access-point coordinates;
- stage-specific services where not explicitly published.

The application therefore shows **`PENDING OFFICIAL POINTS`** rather than manufacturing access recommendations.

The GeoJSON/map contract already supports sourced `spectator-zone` and `spectator-parking` features. A point is only rendered when a coordinate actually exists in the sourced dataset; absent coordinates generate no pin. Published points will therefore become clickable map features without changing the integrity rule.

This deliberately separates two different dimensions of knowledge:

> **A closure time can be known while the correct spatial access point is still unknown.**

`known / pending` is not treated as one global switch for the whole stage.

## Simulation layer

The simulation remains useful, but secondary to the stage brief:

- Ten generic simulated P1 vehicles share one virtual stage clock.
- Planning start grid: SIM-01 through SIM-10 at 180-second intervals, visualized at 60× playback speed.
- The published Rally Chile 2026 entry list confirms ten RC1/Rally1 P1 crews; those official entries are displayed separately from the simulated start slots.
- Entry-list order is **not** treated as the official SS1 running order. The current official Notice Board exposes the entry list but no SS1 start list yet.
- An official start list, event-specific instructions or Live TV intervals override the planning model.
- Motion benchmark: 13:46.4 from the local Rally2 PE1 winner on Turquía. It is used only to validate movement, not as a WRC Rally1 pace forecast.

The reconstructed route is **not an official GPS trace**, the simulated start grid is **not an official running order**, and the motion benchmark is **not a WRC Rally1 forecast**.

## Environmental context

- Explicit START and FINISH markers plus context nodes every 2.5 km along the reference route.
- Client-side Open-Meteo context for the planned stage start: temperature, 10 m wind, gusts, precipitation and returned location elevation.
- The forecast request explicitly enables the 16-day horizon so the pre-event Chile scenario remains inside the documented forecast window.
- The first map view intentionally contains no place-name labels.

The 2.5 km node spacing is a visualization sampling interval. It does **not** claim 2.5 km meteorological resolution, and Open-Meteo values are modelled context rather than local station observations.

If the forecast is outside the available model horizon or the external API is unavailable, the route, markers, access state and fleet simulation continue to work without weather values.

## Data rule

The project distinguishes three evidence states:

- `planned` — schedule, entry, access rule or other pre-event information from a named source.
- `simulated` — values generated or replayed by our model.
- `observed` — recorded timing, split or telemetry-like information.

Additional integrity rules:

- Unknown values stay unknown.
- Reconstructed geometry stays explicitly different from verified geometry.
- Modelled environmental context stays explicitly different from observations.
- Entry lists stay explicitly different from start lists.
- Route geometry stays explicitly different from authorized spectator access.
- A known temporal rule does not imply a known spatial access point.
- Community/navigation hints do not become safety instructions without an official source.
- Organizer, authority and race-direction instructions override the model.

## Stack

- React 19
- TypeScript
- Vite
- MapLibre GL
- Turf.js
- Open-Meteo Weather Forecast API
- Static JSON snapshots

No backend, database, login or paid API is required for the current version.

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

`buildRouteNodes → Open-Meteo multi-location request → normalize forecast → summarize/present`

Spectator/access context is an independent sourced layer:

`StageSpectatorInfo → verified coordinates only → buildStageGeoJson → clickable MapLibre spectator features`

That separation lets a later official start-list adapter replace generic SIM slots, a timing/split adapter replace simulated progress, a different environmental source replace Open-Meteo, or a newly published spectator guide add map points without rewriting the rest of the UI.

## Sources

Source URLs and access dates are stored inside the static rally dataset where applicable. Current route and context sources include:

- WRC Rally Chile Bio Bío 2026 route announcement for event/stage context.
- Rally Chile Bio Bío official 2026 Notice Board / Sportity for the currently published entry/start-list documents.
- Rally Chile Bio Bío spectator guidance for event-level access information.
- BioBioChile WRC Chile 2026 access guidance for the published 20:00 closure rule, capacity caveat, exit rule and safety-train timing.
- Rally Chile Bio Bío 2026 official entry list for the ten RC1/Rally1 P1 crews.
- FIA 2026 WRC Sporting Regulations, section 41.3, for start-interval rules. The 180-second P1 interval is a planning assumption and not an event-issued start time.
- ANARE / Copec RallyMobil Nacimiento–Negrete 2026 PE1 Turquía competition map for route shape validation.
- OpenStreetMap road centerlines under ODbL 1.0 for the reference LineString.
- ANARE PE1 timing results for the motion-only benchmark.
- Open-Meteo Weather Forecast API for modelled environmental context requested at runtime.

## License

Code is MIT licensed. External data remains subject to the terms of its original source. OpenStreetMap-derived geometry requires ODbL attribution.
