# rally-stage-sim

Open-source experiment for reading a rally stage as more than a line on a map: **route, start time, weather context, closures, access and simulated movement** in one place.

The first scenario is **WRC Rally Chile Bio Bío 2026**.

> Unofficial project for research, education and visualization. Not affiliated with FIA, WRC Promoter GmbH or the event organizers.

## What works today

The app contains the full Rally Chile 2026 schedule and interactive briefs for all six Friday stages:

- `SS1 Turquía 1` — 08:53
- `SS2 Nuevo Rere 1` — 09:48
- `SS3 Hualqui 1` — 10:36
- `SS4 Turquía 2` — 15:09
- `SS5 Nuevo Rere 2` — 16:04
- `SS6 Hualqui 2` — 16:52

Friday uses three roads twice. The second pass reuses the route geometry, but **not the time-dependent context**:

- `SS4 → SS1 geometry`
- `SS5 → SS2 geometry`
- `SS6 → SS3 geometry`

So SS1 and SS4 can share the same road while still asking for weather around different start times.

The full event snapshot currently has **16 competitive stages / 311.70 km**.

## What you see on a stage map

Each interactive Friday stage is designed to explain itself without requiring several clicks.

The map can show:

- the reconstructed route;
- `START` and `FINISH`;
- distance marks every 5 km;
- direction arrows;
- a small set of environmental labels along the route;
- planned start time;
- geometry status;
- weather source/status;
- closure context;
- public-access status;
- official spectator, parking, access or no-spectator points **only when they have their own spatial source**.

The analytical weather sampling remains every 2.5 km, but only a few representative labels are drawn by default so the map stays readable.

## Weather

The app does not assume that a rally date is always inside the forecast window.

For each stage it tries, in this order:

1. **Forecast** — Open-Meteo forecast for the planned stage time.
2. **Historical reference** — if forecast is not available, use 2021–2025 values for the same calendar day and local stage hour.
3. **Unavailable** — if neither source can be loaded, the route and operational context still remain usable.

The historical reference uses the **median per route node and variable**, with at least three valid years. Historical wind direction is intentionally left unavailable because a normal linear median is not appropriate for circular degrees.

The UI labels the active source explicitly:

- `FORECAST · OPEN-METEO`
- `HISTORICAL REFERENCE · 2021–2025`

A historical reference is **not** presented as a forecast, climate normal or rally-day observation.

## Pass 1 vs Pass 2

Repeated Friday stages can compare the weather context from the morning pass with the afternoon pass.

The comparison uses `Pass 2 − Pass 1` and can report:

- mean temperature change;
- maximum gust change;
- precipitation-signal change;
- where the strongest temperature shift appears along the sampled route.

The comparison only runs when both passes use the same kind of evidence:

- forecast ↔ forecast, or
- historical reference ↔ historical reference.

It is a **weather-model comparison**. It does not claim that grip, mud, dust or road condition actually changed.

## Route quality

The Friday routes are useful references, but they are not official organizer GPS traces.

Current geometry:

- **SS1 / SS4 Turquía** — 22.94 km stage; dense ~22.90 km road-centerline reconstruction using OpenStreetMap and current competition-map context.
- **SS2 / SS5 Nuevo Rere** — dense 286-coordinate reconstruction from Rally-Maps 2026, about 10.811 km.
- **SS3 / SS6 Hualqui** — dense 416-coordinate reconstruction from Rally-Maps 2026, about 16.706 km.

All remain explicitly marked as **reconstructed**, not verified GPS.

There are also current public-source distance differences that the app keeps visible instead of silently choosing one value:

- Nuevo Rere: `10.92 km schedule / 10.76 km WRC technical`
- Hualqui: `16.79 km schedule / 16.69 km WRC technical`

More coordinates can make a reconstruction more useful, but they do not make it official.

## Spectator and access information

A route on a map is not the same thing as an authorized way to reach it.

Current event-level guidance includes:

- general road closure at 20:00 on the day before the stage;
- access may close earlier if spectator capacity is reached;
- spectator exit only in the direction of competition after the `Rastrillo` authorizes reopening;
- safety vehicles before the first competitor:
  - safety vehicles: T−110 min;
  - Auto 000: T−50 min;
  - FIA car: T−35 min;
  - Auto 00: T−20 min;
  - Auto 0: T−10 min.

A general rule can apply to the event, but a stage-specific point cannot be copied from another stage.

If official coordinates for parking, access or spectator areas are not available, the app says so instead of inventing a recommendation.

That means this is a valid state:

> **The closure time is known, but the correct access point is still pending.**

## Simulation

Simulation is a secondary layer, not the source of truth.

SS1 Turquía currently includes:

- ten generic simulated P1 vehicles;
- one shared virtual stage clock;
- simulated starts every 180 seconds;
- 60× playback speed;
- a 13:46.4 local Rally2 PE1 time used only as a movement benchmark.

The real 2026 RC1/Rally1 entry list is displayed separately from those simulated slots.

The entry list is **not** treated as the official SS1 start order, and the movement benchmark is **not** a Rally1 pace forecast.

SS2–SS6 currently focus on route, weather and access context and do not yet have a calibrated movement simulation.

## Data rules

The project keeps three evidence states separate:

- `planned` — schedule, entry, access rule or other pre-event information from a named source;
- `simulated` — generated or replayed by the model;
- `observed` — recorded timing, split or telemetry-like information.

A few rules are intentionally strict:

- unknown stays unknown;
- missing does not become zero;
- reconstructed geometry does not become official GPS;
- forecast does not become observation;
- historical reference does not become forecast;
- entry list does not become start list;
- route geometry does not become authorized spectator access;
- event-level rules do not create stage-specific coordinates;
- community hints do not become safety instructions;
- organizer, authority and race-direction instructions override the model.

## Stack

- React 19
- TypeScript
- Vite
- MapLibre GL
- Turf.js
- Open-Meteo Forecast API
- Open-Meteo Historical Weather API
- static JSON snapshots

No backend, database, login or paid API is required for the current version.

## Run locally

```bash
npm install
npm test
npm run dev
npm run build
```

## How it is organized

The schedule and the technical route data are deliberately separate:

```text
schedule snapshot
+ technical stage datasets
+ explicit route-reuse mapping
→ materialized Friday stages
→ rally overview / stage brief
```

Repeated passes reuse only the route geometry:

```text
SS1 geometry → SS1 at 08:53
             → SS4 at 15:09
```

Weather is resolved independently for each stage time:

```text
route nodes
→ forecast
→ historical reference 2021–2025 if needed
→ unavailable if both fail
→ map labels + summary + pass comparison
```

Vehicle movement remains small and replaceable:

```text
planned start grid
→ stage progress
→ position along route
→ fleet snapshot
→ MapLibre
```

Spectator/access information stays independent from route geometry:

```text
event operating rules
+ stage-specific sourced coordinates
→ map context
```

This separation lets the app add another stage without pretending that every part of its operational context has the same confidence level.

## Sources

Source URLs and access dates are stored in the static rally datasets where applicable. Current sources include:

- WRC Rally Chile Bio Bío 2026 route announcement;
- Rally Chile Bio Bío official 2026 Notice Board / Sportity;
- Rally Chile Bio Bío spectator guidance;
- BioBioChile WRC Chile 2026 schedule and access guidance;
- Rally Chile Bio Bío 2026 official entry list;
- FIA 2026 WRC Sporting Regulations, section 41.3;
- ANARE / Copec RallyMobil Nacimiento–Negrete 2026 competition maps;
- Rally-Maps Rally Chile BIOBÍO 2026 stage references;
- Rally Chile Bio Bío 2023 official road book;
- OpenStreetMap road centerlines under ODbL 1.0;
- ANARE PE1 timing results;
- Open-Meteo Forecast API;
- Open-Meteo Historical Weather API.

## License

Code is MIT licensed. External data remains subject to the terms of its original source. OpenStreetMap-derived geometry requires ODbL attribution.
