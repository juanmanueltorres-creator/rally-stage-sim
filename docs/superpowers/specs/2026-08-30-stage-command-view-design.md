# Stage Command View — Design

**Date:** 2026-08-30  
**Scope:** visual/interaction upgrade for the existing Rally Chile stage detail experience.  
**Status:** approved direction, implementation not started.

## Goal

Make the stage page feel like a professional motorsport intelligence interface without changing the domain model, weather logic, route geometry, simulation engine, evidence rules, or current data contracts.

The first screen should explain the stage in a few seconds: **where it is, when it runs, what the route looks like, what the weather context is, and what operational constraints are known**.

## Design direction

Use a **Stage Command View** layout:

1. compact stage header;
2. one-line command/status bar;
3. large map as the visual anchor;
4. compact Pass 1 ↔ Pass 2 comparison;
5. concise conditions + access/safety summary;
6. deeper weather, safety timeline, simulation and provenance behind progressive disclosure.

The map remains the primary geospatial surface. DOM/SVG animation never controls map geometry or replaces MapLibre behavior.

## Visual hierarchy

### Always visible

- stage code/name;
- planned first-car time;
- stage distance;
- geometry state;
- active weather evidence mode;
- large map with START / FINISH / 5 km markers / direction arrows / environmental chips;
- Pass 1 ↔ Pass 2 summary when the route is repeated;
- stage conditions summary;
- access and safety summary;
- share action.

### Progressive disclosure

Collapsed by default on desktop and mobile:

- detailed weather nodes along stage;
- full safety-train timeline;
- simulation controls/details;
- provenance/source list.

The information remains available; only its default visual priority changes.

## Motion

Add **one lightweight motion dependency only**: `motion/mini`.

Use it for short UI transitions only:

- stage header/status entrance;
- subtle map-panel reveal;
- Pass 1 ↔ Pass 2 active-state transition;
- weather metric crossfade when the evidence dataset resolves;
- expansion/collapse of optional detail panels;
- simulation panel reveal before vehicle motion begins.

Target durations: roughly **160–260 ms** for ordinary transitions. No decorative loops, fake counters, parallax, or animation that implies live/observed data.

Respect `prefers-reduced-motion`: transitions must become effectively immediate or minimal when reduced motion is requested.

## Color semantics

Keep the existing palette and use it more deliberately:

- **amber:** stage/time/action/race context;
- **cyan:** environmental/modelled data;
- **red:** safety warnings and simulated vehicle emphasis;
- **green:** verified/allowed spatial access states where already supported;
- **white/off-white:** primary factual information;
- muted grays for secondary explanation.

Reduce the number of equally heavy bordered boxes. Prefer spacing, background depth, thin separators and a few stronger focal surfaces.

## Component changes

### `StageDetail.tsx`

Recompose existing sections into the new hierarchy. Do not change weather fetching, pass-comparison maths, geometry selection, simulation maths, or provenance aggregation.

### `StageCommandBar.tsx` (new)

Small presentational component for the compact stage status row. Inputs should be explicit display values only, for example:

- distance;
- start time;
- geometry state;
- weather label/state;
- closure label;
- public-access label.

It must not fetch data or derive domain state independently.

### `RallyMap.tsx`

Keep current MapLibre sources/layers and stage annotations. Visual changes may adjust container sizing, framing and map-adjacent UI only. Do not introduce a second mapping library.

### `StageMapContextStrip.tsx`

Either fold its useful information into `StageCommandBar` or reduce it to avoid duplicate status information. There should be one clear compact status surface, not two competing summaries.

### `styles.css`

Implement layout, hierarchy, responsive behavior, reduced-motion rules and progressive-disclosure styling incrementally. Preserve current tokens unless a new semantic token is genuinely needed.

### `package.json`

Add only the minimal Motion package/import needed for `motion/mini`. No Radix, shadcn, AutoAnimate, deck.gl, Cesium or resizable-panel dependency in this pass.

## Pass 1 ↔ Pass 2 interaction

The repeated-stage comparison should visually communicate **same road, different time**.

Desktop target:

`08:53 PASS 1 ━━━━━●━━━━━ PASS 2 15:09`

The active pass changes the indicator and emphasis, while the route map remains stable because the road geometry is shared.

The displayed deltas remain exactly the current computed values and evidence rules. No new inferred road-condition language is added.

## Map-first layout

Desktop stage map target height: approximately `60–70vh`, bounded so it still works on laptop screens.

Mobile: keep map high in the page but reduce its height enough that stage identity and key facts remain visible without excessive scrolling.

The map should remain readable with:

- START / FINISH;
- distance labels;
- direction arrows;
- representative environmental chips;
- official spatial points when sourced;
- simulation layer when enabled.

No visual redesign may hide provenance-sensitive labels or make reconstructed geometry appear verified.

## Data and integrity constraints

Unchanged:

- `planned`, `simulated`, and `observed` remain distinct;
- forecast and historical-reference remain distinct evidence modes;
- unknown values remain unknown;
- reconstructed route remains distinct from verified organizer GPS;
- official spectator/access/parking points render only when spatially sourced;
- repeated stages reuse geometry, not time-dependent context;
- Pass 1 ↔ Pass 2 comparison only occurs for comparable weather evidence modes;
- no grip, mud, dust or road-condition claims are introduced.

## Accessibility

- semantic buttons/links remain keyboard reachable;
- visible focus states remain;
- collapsed sections use native button semantics and `aria-expanded`/`aria-controls`;
- color is not the only status signal;
- reduced-motion preference is respected;
- no motion blocks interaction or delays access to content.

## Responsive behavior

### Desktop

- map dominates first meaningful viewport;
- command bar stays compact;
- conditions and access/safety can share a two-column row;
- optional details collapse into clean disclosure rows/panels.

### Mobile

- single-column flow;
- stage identity + command facts remain compact;
- map appears before deep analytics;
- disclosures become full-width touch targets;
- no horizontal scrolling is introduced.

## Testing and verification

Implementation must preserve the current full suite and add focused tests for any new pure presentation helpers or disclosure-state behavior where practical.

Required final checks:

1. `npm test` — all tests green;
2. `npm run build` — TypeScript + Vite production build green;
3. Firefox desktop smoke test on all six Friday stages;
4. mobile-width smoke test;
5. verify forecast/historical-reference labels remain correct;
6. verify repeated-pass comparison remains numerically unchanged;
7. verify simulation still works on SS1;
8. verify no official spatial point appears without sourced coordinates;
9. verify reduced-motion mode does not break the page.

## Non-goals for this pass

- no new backend;
- no new geospatial engine;
- no Cesium migration;
- no deck.gl integration;
- no Radix/shadcn system migration;
- no draggable/resizable dock;
- no domain-model refactor;
- no new WRC data ingestion;
- no change to current evidence methodology.

## Success criteria

The upgrade is successful if the stage page feels substantially more presentation-ready while all current domain behavior remains stable, the map becomes the visual focus, the first viewport communicates the stage quickly, and deep technical detail remains available without dominating the initial experience.