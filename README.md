# rally-stage-sim

Open-source **Stage Intelligence** experiment for understanding a rally stage as route + time + environmental context + access rules, with simulation as an optional secondary layer.

> Unofficial project for research, education and visualization. Not affiliated with FIA, WRC Promoter GmbH or event organizers.

## First scenario

**WRC Rally Chile Bio Bío 2026** is the first dataset. The current version exposes the full 16-stage rally schedule and makes **all six Friday stages — SS1 through SS6 — available as shareable stage briefs**.

Current scenario:

- Event: 10–13 September 2026.
- Full schedule snapshot: 16 competitive stages / 311.70 km.
- Interactive Friday briefs:
  - `#/chile-2026/ss1-turquia`
  - `#/chile-2026/ss2-nuevo-rere`
  - `#/chile-2026/ss3-hualqui`
  - `#/chile-2026/ss4-turquia`
  - `#/chile-2026/ss5-nuevo-rere`
  - `#/chile-2026/ss6-hualqui`
- Runtime interactivity is derived from loaded technical geometry through `withTechnicalAvailability`; the schedule snapshot remains an independent source snapshot rather than encoding application capability.
- WRC states that each of Friday's three stages is run twice. `stage-route-reuse.json` therefore maps SS4→SS1, SS5→SS2 and SS6→SS3 without duplicating route coordinates.
- Each repeated stage keeps its own identity and planned start time, so environmental context is requested for the afternoon pass rather than reusing the morning forecast: SS4 15:09, SS5 16:04 and SS6 16:52 local time.
- SS1 / SS4 Turquía: 22.94 km, with a dense ~22.90 km road-centerline reconstruction map-matched from OpenStreetMap against the organizer/local competition map.
- SS2 / SS5 Nuevo Rere: WRC technical source 10.76 km; the separate schedule snapshot currently says 10.92 km. The UI exposes both rather than silently reconciling them.
- SS3 / SS6 Hualqui: WRC technical source 16.69 km; the separate schedule snapshot currently says 16.79 km. The UI exposes both rather than silently reconciling them.
- SS2 / SS5 Nuevo Rere use a **286-coordinate dense current-route reference reconstruction** derived from Rally-Maps' 2026 interactive geometry. Its geodesic length is ~10.811 km, closely matching the 10.76 km WRC technical distance.
- SS3 / SS6 Hualqui use a **416-coordinate dense current-route reference reconstruction** derived from Rally-Maps' 2026 interactive geometry. Its geodesic length is ~16.706 km, closely matching the 16.69 km WRC technical distance.
- Rally-Maps is an external cartographic reference, not organizer GPS. These routes therefore remain explicitly `reconstructed`, not `verified`.
- Nuevo Rere's new-start alignment is now much better localized than the previous coarse corridor, but remains unverified by an organizer-issued GPS trace.
- Hualqui's reversed/shortened relationship to Pulpería remains useful source context, while the current dense reference geometry replaces the former nine-point sketch.
- First-visit editorial intro explains why a line on a map is not enough to understand a stage operationally.
- Route-wide Open-Meteo context summarizes temperature, wind/gusts, precipitation signal and elevation from sampled nodes shown on each interactive map.
- Stage-condition copy reports modelled signals without claiming observed grip, mud, dust or road state.
- Spectator/access information is modelled separately from route geometry so partially known operational information stays explicit.
- Ten generic simulated P1 vehicles remain available on SS1 as an optional layer, not as the primary user experience. SS2–SS6 currently expose Stage Intelligence without a calibrated movement simulation.

## Geometry quality and environmental context

Not every yellow line has the same evidential method even when the Friday route set is dense.

Current geometry states are explicitly `reconstructed`, but their reconstruction methods differ:

- **SS1 / SS4 Turquía:** dense road-centerline reconstruction, map-matched from OpenStreetMap against current competition-map context.
- **SS2 / SS5 Nuevo Rere:** dense 286-coordinate current-route reference derived from Rally-Maps 2026 and cross-checked against WRC/ANARE context; ~10.811 km geodesic length versus 10.76 km technical distance.
- **SS3 / SS6 Hualqui:** dense 416-coordinate current-route reference derived from Rally-Maps 2026 and cross-checked against WRC/ANARE context; ~16.706 km geodesic length versus 16.69 km technical distance.

The map therefore uses a source-neutral integrity message: a reconstructed line is a **reference reconstruction, not official GPS**. Stage-specific provenance explains how each line was produced.

Dense geometry materially improves route shape, start/finish localization and environmental-node placement, but density alone does not establish authority. Environmental sampling still inherits the evidential quality of the route geometry: Open-Meteo values are useful stage-scale model context and should not be interpreted as observed corner-by-corner conditions.

A repeated pass reuses the route geometry only. **Time-dependent context does not get copied.** SS4, SS5 and SS6 retain their own scheduled starts, so weather requests and safety-train timelines are recomputed for the afternoon pass.

## Spectator and access integrity

Published event-level operating rules can be reused across stages when their scope applies, while stage-specific geography remains isolated.

Known operating guidance used for the Friday stages includes:

- General road closure: 20:00 on the day before the stage day.
- Access may close earlier when spectator capacity is reached.
- Spectator exit is only in the direction of competition and after the `Rastrillo` authorizes reopening.
- Published safety-train offsets are represented relative to each stage's planned first-car time:
  - safety vehicles: T−110 min;
  - Auto 000: T−50 min;
  - FIA car: T−35 min;
  - Auto 00: T−20 min;
  - Auto 0: T−10 min.

Still pending official stage-specific publication where applicable:

- exact spectator-zone coordinates;
- exact parking coordinates;
- exact spectator access-point coordinates;
- stage-specific services where not explicitly published.

The application therefore shows **`PENDING OFFICIAL POINTS`** rather than manufacturing access recommendations.

Event-level fallback deliberately inherits only temporal/operating guidance and provenance. It does **not** inherit spectator-zone or parking coordinates from another stage. A pin from Turquía can never appear on Nuevo Rere or Hualqui just because they share the same event guidance.

The GeoJSON/map contract already supports sourced `spectator-zone` and `spectator-parking` features. A point is only rendered when a coordinate actually exists in the sourced dataset; absent coordinates generate no pin.

This deliberately separates different dimensions of knowledge:

> **A closure time can be known while the correct spatial access point is still unknown.**

`known / pending` is not treated as one global switch for the whole stage.

## Simulation layer

The simulation remains useful, but secondary to the stage brief:

- SS1 currently has the movement benchmark and ten generic simulated P1 vehicles sharing one virtual stage clock.
- Planning start grid: SIM-01 through SIM-10 at 180-second intervals, visualized at 60× playback speed.
- The published Rally Chile 2026 entry list confirms ten RC1/Rally1 P1 crews; those official entries are displayed separately from the simulated start slots.
- Entry-list order is **not** treated as the official SS1 running order. The current official Notice Board exposes the entry list but no SS1 start list yet.
- An official start list, event-specific instructions or Live TV intervals override the planning model.
- Motion benchmark: 13:46.4 from the local Rally2 PE1 winner on Turquía. It is used only to validate movement, not as a WRC Rally1 pace forecast.
- SS2–SS6 currently show `SIMULACIÓN PENDIENTE`; route, weather and access context do not depend on having a movement model.

The reconstructed routes are **not official GPS traces**, the simulated start grid is **not an official running order**, and the SS1 motion benchmark is **not a WRC Rally1 forecast**.

## Environmental context

- Explicit START and FINISH markers plus context nodes every 2.5 km along each interactive reference route.
- Client-side Open-Meteo context for the planned stage start: temperature, 10 m wind, gusts, precipitation and returned location elevation.
- The forecast request explicitly enables the 16-day horizon so the pre-event Chile scenario remains inside the documented forecast window.
- The first map view intentionally contains no place-name labels.

The 2.5 km node spacing is a visualization sampling interval. It does **not** claim 2.5 km meteorological resolution, and Open-Meteo values are modelled context rather than local station observations.

If the forecast is outside the available model horizon or the external API is unavailable, route geometry, markers and access state remain usable without weather values.

## Data rule

The project distinguishes three evidence states:

- `planned` — schedule, entry, access rule or other pre-event information from a named source.
- `simulated` — values generated or replayed by our model.
- `observed` — recorded timing, split or telemetry-like information.

Additional integrity rules:

- Unknown values stay unknown.
- Reconstructed geometry stays explicitly different from verified geometry.
- Reconstruction method and confidence can differ by stage even when the shared state is `reconstructed`.
- Dense third-party geometry does not become official GPS merely because it contains many coordinates.
- Reusing geometry for a repeated pass does not reuse time-dependent weather or operational timing.
- Modelled environmental context stays explicitly different from observations.
- The precision of derived environmental sampling cannot exceed the practical quality of the reference geometry.
- Schedule distance and technical distance remain separate when current public sources disagree.
- Entry lists stay explicitly different from start lists.
- Route geometry stays explicitly different from authorized spectator access.
- A known temporal rule does not imply a known spatial access point.
- Event-level operating guidance may be inherited; stage-specific spatial points may not.
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

Schedule and technical availability are intentionally separate:

`schedule snapshot + technical stage datasets → materializeTechnicalStages → withTechnicalAvailability → rally overview`

The technical route data stays normalized instead of copying hundreds of coordinates for repeated passes:

`stages.json (SS1) + stages-friday.json (SS2/SS3) + stage-route-reuse.json (SS4→SS1, SS5→SS2, SS6→SS3) → technical stage catalog`

The reuse mapping copies route geometry/method while stage identity, sequence and planned start come from the independent schedule snapshot. That makes the afternoon weather and safety timeline time-specific without duplicating the route itself.

Vehicle movement stays deliberately small and replaceable:

`stageProgress → positionAlongLine → vehicleSnapshot`

The fleet layer adds scheduling without duplicating movement logic:

`buildPlannedStartGrid → fleetSnapshot → buildStageGeoJson → MapLibre`

Environmental context follows a separate path for any technical stage with geometry:

`buildRouteNodes → Open-Meteo multi-location request → normalize forecast → summarize/present`

Spectator/access context is an independent sourced layer:

`StageSpectatorInfo → stage-specific coordinates only → buildStageGeoJson → clickable MapLibre spectator features`

That separation lets another technical stage become shareable by supplying geometry and provenance, or by explicitly reusing a sourced repeated route, without duplicating the stage-page implementation or modifying the source schedule snapshot.

## Sources

Source URLs and access dates are stored inside the static rally dataset where applicable. Current route and context sources include:

- WRC Rally Chile Bio Bío 2026 route announcement for current stage relationships, technical-distance context and the statement that each Friday stage is run twice.
- Rally Chile Bio Bío official 2026 Notice Board / Sportity for currently published entry/start-list documents.
- Rally Chile Bio Bío spectator guidance for event-level access information.
- BioBioChile WRC Chile 2026 access guidance for the published 20:00 closure rule, capacity caveat, exit rule and safety-train timing.
- Rally Chile Bio Bío 2026 official entry list for the ten RC1/Rally1 P1 crews.
- FIA 2026 WRC Sporting Regulations, section 41.3, for start-interval rules. The 180-second P1 interval is a planning assumption and not an event-issued start time.
- ANARE / Copec RallyMobil Nacimiento–Negrete 2026 PE1 Turquía, PE2 Nuevo Rere and PE3 Hualqui competition maps as current route-shape context.
- Rally-Maps Rally Chile BIOBÍO 2026 interactive stage references for the dense SS2 Nuevo Rere and SS3 Hualqui reconstructed geometries. Rally-Maps is a third-party cartographic source, not organizer GPS.
- Rally Chile Bio Bío 2023 official road book for historical Rere and Pulpería relationship/control context used as a cross-check.
- OpenStreetMap road centerlines under ODbL 1.0 for the dense SS1 reference LineString. SS2/SS3 are not presented as OSM road-centerline map-matches.
- ANARE PE1 timing results for the SS1 motion-only benchmark.
- Open-Meteo Weather Forecast API for modelled environmental context requested at runtime.

## License

Code is MIT licensed. External data remains subject to the terms of its original source. OpenStreetMap-derived geometry requires ODbL attribution.
