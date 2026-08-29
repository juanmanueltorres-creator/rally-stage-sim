# Shareable Stage Intelligence Experience — Design

Date: 2026-08-29
Status: proposed for implementation
Branch: `feat/chile-2026-foundation`

## 1. Product direction

`rally-stage-sim` stops treating the vehicle simulation as the primary product experience.

The primary flow becomes:

`Intro → Rally overview → Stage → Stage intelligence → Share`

Simulation remains available as an optional tool inside a stage.

The product should answer a practical question in a few seconds:

> What is this stage, what conditions can I expect along it, and what do I need to know before going there?

The intended audience is broader than competitors. A stage page must be useful to a spectator opening a shared link on a phone, while preserving enough provenance and environmental context to remain technically credible.

## 2. Integrity rules

The existing integrity contract remains non-negotiable:

- planned ≠ simulated ≠ observed;
- reconstructed geometry ≠ verified geometry;
- modelled weather ≠ station observation;
- entry list ≠ start list;
- inferred or modelled stage-condition indicators must never be presented as actual grip or actual road state;
- unknown access, parking, spectator-zone and closure information remains visibly unknown until an official source is available;
- organizer/FIA instructions override product assumptions.

For public/safety logistics, the application must prefer official Rally Chile/FIA information over community tips. Community reports may inform product design, but not become route-access instructions without verification.

## 3. Why the experience exists

The first visit opens with a short editorial overlay rather than dropping an unexplained map on the user.

It does not explicitly say “problems for drivers” or “problems for spectators”. It communicates the friction in plain language:

- a stage can have different weather from one end to the other;
- access can close long before the first competitive car;
- the road can evolve between passes;
- route, weather, access and official notices are usually spread across different places.

Draft copy direction:

> Llegar a un tramo no es solamente saber dónde queda. Puede llover en una punta y estar seco en la otra. Un acceso puede cerrar horas antes. La segunda pasada puede encontrarse con un camino distinto a la primera. Y cuando la información está repartida entre mapas, pronósticos y comunicados, entender qué está pasando cuesta más de lo necesario.
>
> Acá juntamos el tramo, el tiempo y el contexto en un solo lugar.

Primary CTA: `VER RALLY CHILE 2026`

Secondary action: `WHY THIS EXISTS`

The overlay is shown on first visit only, using a small localStorage flag. A user can reopen it later from the application chrome.

## 4. Information architecture

### 4.1 Rally overview

The home screen represents the event rather than a single stage.

Header:

- Rally Chile Bio Bío 2026
- dates
- total competitive distance when sourced
- simple freshness/status indicator

The route list is grouped by rally day.

Each stage card should prioritize only scannable information:

- stage code and name;
- scheduled first-car/first-slot time;
- distance;
- compact forecast summary when environmental data can be computed;
- source/geometry readiness state;
- `VIEW STAGE` action.

A stage without verified geometry or environmental coverage may still appear in the rally list, but it must show the limitation instead of fabricating metrics.

For the first implementation, SS1 Turquía is the fully interactive stage. Other 2026 stage metadata may be added only when sourced from official/current material.

### 4.2 Shareable stage page

Initial share-safe route format:

`/#/chile-2026/ss1-turquia`

A hash route is preferred for the first version because the project is a Vite SPA with no router dependency and may be hosted statically. The internal route model should not depend on the hash representation so clean paths can be introduced later with hosting rewrites.

Stage page hierarchy:

1. compact stage header;
2. stage summary/weather strip;
3. map with route and environmental nodes;
4. along-stage weather detail;
5. stage conditions/context;
6. spectator info and access/safety;
7. provenance/freshness;
8. optional simulation section.

A `SHARE STAGE` action copies the canonical stage URL using the Web Share API when available and clipboard fallback otherwise.

## 5. Stage header

The stage header should read like a field brief, not a dashboard wall.

Example hierarchy:

`SS1 · TURQUÍA`

`22.94 km · 08:53 · geometry: reconstructed`

Weather strip:

- temperature range along sampled nodes;
- maximum wind gust;
- precipitation signal;
- elevation range;
- forecast timestamp/status.

Unknown values are rendered as `—` or `PENDING`, not zero.

## 6. Weather along the stage

Reuse the existing Open-Meteo multi-node flow and environmental sampling.

Existing variables retained:

- temperature at 2 m;
- wind speed at 10 m;
- wind direction at 10 m;
- wind gusts at 10 m;
- precipitation;
- returned elevation.

The stage-level summary is derived from the node collection, not from a new weather source.

Examples of safe derived labels:

- `TEMP 13–17 °C`
- `MAX GUST 31 km/h`
- `PRECIP SIGNAL 1.8 mm max/hourly node value`
- `ELEV 84–271 m`

The product must retain the existing disclaimer that node spacing is visualization sampling and not meteorological resolution.

## 7. Stage conditions

This section interprets sourced/modelled information conservatively.

Initial indicators may include:

- rainfall expected/not expected along sampled nodes;
- wind exposure;
- temperature spread;
- elevation spread;
- Pass 1 / Pass 2 context when the itinerary defines repeated stages.

Do not label the road as `wet`, `dry`, `muddy`, `good grip`, etc. solely from forecast data.

Preferred wording:

- `rainfall signal present after km 12`;
- `higher gust exposure near finish`;
- `temperature spread of 4 °C across the route`;
- `second pass — surface evolution possible`.

Any future dust, rutting, mud or road-evolution model must be explicitly marked as a proxy/model and implemented separately.

## 8. Spectator information

The spectator panel is designed around recurring real-world planning friction: access timing, road closure, parking, walking distance, spectator areas and whether movement between stages is realistically possible.

Fields:

- official spectator zones;
- official access points;
- road/access closure time;
- parking;
- walking distance if officially documented or safely derivable from verified points;
- shuttle/public transport if published;
- toilets/food/services when published;
- organizer safety notice;
- source and last update.

When unavailable:

- `OFFICIAL ACCESS · PENDING`
- `PARKING · PENDING OFFICIAL GUIDE`
- `ROAD CLOSURE · PENDING`

Never replace missing official spectator logistics with an invented route or recommendation.

Current official context to preserve in data/provenance:

- Rally Chile reports that route access closes the day before each stage begins;
- official communication emphasizes designated spectator areas and authority instructions;
- the event publishes Rally Guides/Documents and may add more detailed spectator information as the rally approaches.

## 9. Safety presentation

Safety information should be prominent but compact.

Rules:

- only present official or directly sourced safety/access instructions as instructions;
- no “secret spot” recommendations;
- no routing that sends users through the competitive stage after closure;
- use `PENDING OFFICIAL INFO` rather than inference when official spectator access is incomplete;
- link to source material when available.

## 10. Visual system

The visual language should align with the user’s existing GeoPlatform / Pulso Territorial / Anti IA work rather than adopting a generic motorsport aesthetic.

### Base

- dark blue-charcoal page background;
- near-black content panels;
- subtle low-contrast borders;
- warm off-white primary text;
- muted cool-gray supporting text;
- warm amber/copper primary accent;
- selective cyan/blue secondary accent.

### Principle

`Structure stays sober; live/interactive data gets the color.`

Use stronger color mainly for:

- CTA buttons;
- map nodes;
- weather states;
- stage status chips;
- simulation vehicles.

Avoid broad neon gradients, gaming UI, excessive red/green, or decorative dashboard chrome.

### Typography

Use an editorial serif for prominent rally/stage titles and a technical sans-serif/system stack for UI labels, metrics and controls.

No paid font dependency is required for v1. The implementation should prefer resilient local/system stacks.

### Map

Keep the basemap visually subdued. The route should remain easy to trace, while environmental nodes become more expressive through status color and hover/tap details.

Map status colors must always have a textual/icon cue so meaning is not encoded by color alone.

## 11. Simulation placement

Simulation remains in the project but moves below stage intelligence.

The stage page exposes an action such as:

`▶ SIMULATE STAGE`

The existing ten generic P1 vehicles, planned 180-second interval and motion benchmark remain clearly simulated.

The simulation must not block the initial weather/access experience and should not autoplay before the user reaches or opens the simulation section.

## 12. Data model additions

Introduce a small presentation-oriented stage-intelligence layer rather than adding backend infrastructure.

Suggested concepts:

```ts
interface StageSpectatorInfo {
  stageId: string
  accessStatus: 'known' | 'pending'
  roadClosureText?: string
  spectatorZones: SpectatorPoint[]
  parking: SpectatorPoint[]
  services: SpectatorService[]
  safetyNote?: string
  provenance: DataProvenance
}

interface StageWeatherSummary {
  temperatureMinC?: number
  temperatureMaxC?: number
  maxGustKmh?: number
  maxPrecipitationMm?: number
  elevationMinM?: number
  elevationMaxM?: number
  sampledAtIso?: string
}
```

The weather summary should be a pure derivation from existing environmental-node responses.

Spectator information should initially live in static versioned JSON beside the event snapshot. This keeps the project free, auditable and deployable as a static application.

## 13. Navigation implementation

Do not add React Router for the first increment unless implementation proves the simple route state insufficient.

Create a tiny route parser with three states:

- intro/rally overview;
- rally overview;
- stage detail.

It reads `window.location.hash`, handles `hashchange`, and produces a typed route object. Unknown routes return to the rally overview rather than failing blank.

This keeps bundle/dependency cost low and makes direct stage links static-host friendly.

## 14. Error and offline-tolerant behavior

- If core event/stage JSON fails: show a clear load error.
- If Open-Meteo fails: stage route, static metadata, spectator status and provenance still render.
- If spectator data is absent: render explicit pending states.
- If a shared stage slug is unknown: show rally overview plus a compact “stage not found” notice.
- If Web Share is unavailable: copy the URL to clipboard.

## 15. Testing strategy

Keep behavior logic outside React where possible.

Add pure tests for:

1. route parsing and stage-link generation;
2. first-visit intro state helper/localStorage contract where feasible;
3. weather-summary derivation from environmental nodes;
4. pending spectator-state normalization;
5. share URL generation;
6. existing environmental and simulation tests remain green.

Build verification remains `npm test` + `npm run build`.

## 16. Increment boundaries

### Increment A — approved target

- editorial first-visit intro;
- rally overview shell and stage-card architecture;
- shareable SS1 Turquía hash route;
- SS1 stage page using existing route + Open-Meteo pipeline;
- derived weather summary;
- spectator/access/safety panel with sourced values or explicit pending states;
- refreshed dark editorial visual system;
- share action;
- simulation moved to secondary stage section.

### Not in Increment A

- synthetic grip estimates;
- unofficial spectator routes;
- automatic car/driver performance prediction;
- backend/database/auth;
- user accounts;
- push notifications;
- all 2026 stage geometries;
- live FIA timing integration.

## 17. Current public-source rationale

The implementation is motivated by current official and community evidence, while application facts must still be sourced individually:

- WRC’s 2026 route announcement states that almost 40% of Rally Chile’s route is new/revised and that Friday’s Turquía, Nuevo Rere and Hualqui loop has been reworked.
- Rally Chile states that the first Friday action begins at 08:53, the event totals 311.70 competitive km, and public access to stages closes the day before the stage begins.
- Rally Chile’s official communications emphasize designated spectator areas and following authority instructions.
- Community reports repeatedly identify parking, road closure timing, stage access and navigation around closed competitive roads as major spectator-planning pain points.

Sources used for design research:

- https://www.wrc.com/en/news/rally-chile-bio-bio-reveals-revamped-route-for-2026
- https://rallychilebiobio.com/2026/08/25/lo-que-se-viene-en-septiembre/
- https://rallychilebiobio.com/2026/05/19/rally-guide-1-publicado/
- https://rallychilebiobio.com/2026/08/05/presentada-en-concepcion-la-quinta-edicion-del-rally-chile-biobio/
- https://www.reddit.com/r/WRC/comments/1s7m87g/why_are_there_marked_spectator_spots_and_parking/
- https://www.reddit.com/r/rally/comments/1hnljva/how_to_attend_wrc_event/

## 18. Success criteria

A first-time user should be able to:

1. understand why the product exists in under 15 seconds;
2. dismiss the intro and see Rally Chile as a collection of stages;
3. open SS1 Turquía;
4. understand distance, start time, route, forecast variation and access-data status without reading documentation;
5. distinguish modelled weather from observed conditions;
6. distinguish pending spectator information from verified access information;
7. share a URL that reopens the same stage;
8. optionally open the simulation without confusing it with live timing.

The result should feel visually related to GeoPlatform / Pulso Territorial / Anti IA: editorial, dark, technical and restrained, with stronger color reserved for information that is active or changing.