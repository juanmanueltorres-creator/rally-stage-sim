import assert from 'node:assert/strict'
import test from 'node:test'
import type { SpectatorPoint, StageLineString } from '../domain/rally.ts'
import type { RouteNode } from './environmentNodes.ts'
import type { RouteDirectionArrow, RouteDistanceMarker } from './routeAnnotations.ts'
import { buildStageGeoJson, type StageMapEnvironmentChip } from './stageGeoJson.ts'

const line: StageLineString = {
  type: 'LineString',
  coordinates: [
    [-72.72, -37.25],
    [-72.70, -37.22],
  ],
}

const nodes: RouteNode[] = [
  { id: 'start', role: 'start', distanceKm: 0, coordinate: [-72.72, -37.25] },
  { id: 'km-2.5', role: 'context', distanceKm: 2.5, coordinate: [-72.71, -37.235] },
  { id: 'finish', role: 'finish', distanceKm: 4, coordinate: [-72.70, -37.22] },
]

const vehicles = [
  { simulationId: 'SIM-01', status: 'running' as const, progress: 0.5, coordinate: [-72.71, -37.235] as [number, number] },
  { simulationId: 'SIM-02', status: 'waiting' as const, progress: 0, coordinate: [-72.72, -37.25] as [number, number] },
]

const pointProvenance = {
  state: 'planned' as const,
  sources: [{ label: 'Organizer spectator map', url: 'https://example.com/map', accessedAt: '2026-08-30' }],
}

const spectatorZones: SpectatorPoint[] = [
  {
    id: 'zone-a',
    label: 'Zona de público A',
    coordinate: [-72.705, -37.23],
    description: 'Zona publicada por el organizador.',
    provenance: pointProvenance,
  },
  {
    id: 'zone-unsourced',
    label: 'No debe renderizar',
    coordinate: [-72.704, -37.231],
  },
]

const parking: SpectatorPoint[] = [
  { id: 'parking-a', label: 'Parking A', coordinate: [-72.707, -37.232], provenance: pointProvenance },
]

const accessPoints: SpectatorPoint[] = [
  { id: 'access-a', label: 'Acceso oficial A', coordinate: [-72.709, -37.234], provenance: pointProvenance },
]

const noSpectatorZones: SpectatorPoint[] = [
  { id: 'no-a', label: 'No público A', coordinate: [-72.711, -37.236], provenance: pointProvenance },
]

const distanceMarkers: RouteDistanceMarker[] = [
  { distanceKm: 5, label: 'KM 5', coordinate: [-72.708, -37.234] },
]

const directionArrows: RouteDirectionArrow[] = [
  { coordinate: [-72.706, -37.232], bearingDeg: 42 },
]

const environmentChips: StageMapEnvironmentChip[] = [
  { nodeId: 'km-2.5', coordinate: [-72.71, -37.235], label: 'KM 2.5 · 14 °C', weatherMode: 'forecast' },
]

test('buildStageGeoJson returns structural annotations and only individually sourced spectator geography', () => {
  const geojson = buildStageGeoJson(
    line,
    vehicles,
    'reconstructed',
    nodes,
    { spectatorZones, parking, accessPoints, noSpectatorZones },
    { distanceMarkers, directionArrows, environmentChips },
  )

  assert.equal(geojson.type, 'FeatureCollection')
  assert.equal(geojson.features.length, 13)
  assert.equal(geojson.features[0].geometry.type, 'LineString')
  assert.deepEqual(geojson.features[0].geometry.coordinates, line.coordinates)
  assert.equal(geojson.features[0].properties.kind, 'stage-route')

  const zone = geojson.features.find((feature) => feature.properties.spectatorId === 'zone-a')
  assert.equal(zone?.properties.kind, 'spectator-zone')
  assert.equal(zone?.properties.label, 'Zona de público A')

  assert.equal(geojson.features.some((feature) => feature.properties.spectatorId === 'zone-unsourced'), false)

  const parkingPoint = geojson.features.find((feature) => feature.properties.spectatorId === 'parking-a')
  assert.equal(parkingPoint?.properties.kind, 'spectator-parking')

  const access = geojson.features.find((feature) => feature.properties.spectatorId === 'access-a')
  assert.equal(access?.properties.kind, 'official-access')

  const prohibited = geojson.features.find((feature) => feature.properties.spectatorId === 'no-a')
  assert.equal(prohibited?.properties.kind, 'no-spectator-zone')

  const distanceMarker = geojson.features.find((feature) => feature.properties.kind === 'distance-marker')
  assert.equal(distanceMarker?.properties.label, 'KM 5')

  const arrow = geojson.features.find((feature) => feature.properties.kind === 'direction-arrow')
  assert.equal(arrow?.properties.bearingDeg, 42)

  const chip = geojson.features.find((feature) => feature.properties.kind === 'environment-chip')
  assert.equal(chip?.properties.weatherMode, 'forecast')
})
