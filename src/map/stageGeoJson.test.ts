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
  {
    simulationId: 'SIM-01',
    status: 'running' as const,
    progress: 0.5,
    coordinate: [-72.71, -37.235] as [number, number],
  },
  {
    simulationId: 'SIM-02',
    status: 'waiting' as const,
    progress: 0,
    coordinate: [-72.72, -37.25] as [number, number],
  },
]

const spectatorZones: SpectatorPoint[] = [
  {
    id: 'zone-a',
    label: 'Zona de público A',
    coordinate: [-72.705, -37.23],
    description: 'Zona publicada por el organizador.',
  },
]

const parking: SpectatorPoint[] = [
  {
    id: 'parking-a',
    label: 'Parking A',
    coordinate: [-72.707, -37.232],
  },
]

const distanceMarkers: RouteDistanceMarker[] = [
  { distanceKm: 5, label: 'KM 5', coordinate: [-72.708, -37.234] },
]

const directionArrows: RouteDirectionArrow[] = [
  { coordinate: [-72.706, -37.232], bearingDeg: 42 },
]

const environmentChips: StageMapEnvironmentChip[] = [
  {
    nodeId: 'km-2.5',
    coordinate: [-72.71, -37.235],
    label: 'KM 2.5 · 14 °C',
    weatherMode: 'forecast',
  },
]

test('buildStageGeoJson returns route, cars, nodes, sourced spectator points and default-visible annotations', () => {
  const geojson = buildStageGeoJson(
    line,
    vehicles,
    'reconstructed',
    nodes,
    { spectatorZones, parking },
    { distanceMarkers, directionArrows, environmentChips },
  )

  assert.equal(geojson.type, 'FeatureCollection')
  assert.equal(geojson.features.length, 11)
  assert.equal(geojson.features[0].geometry.type, 'LineString')
  assert.deepEqual(geojson.features[0].geometry.coordinates, line.coordinates)
  assert.equal(geojson.features[0].properties.kind, 'stage-route')
  assert.equal(geojson.features[0].properties.geometryStatus, 'reconstructed')

  const sim01 = geojson.features.find((feature) => feature.properties.simulationId === 'SIM-01')
  assert.equal(sim01?.properties.kind, 'simulated-vehicle')
  assert.equal(sim01?.properties.status, 'running')
  assert.equal(sim01?.properties.progress, 0.5)

  const environmentNode = geojson.features.find((feature) => feature.properties.nodeId === 'km-2.5' && feature.properties.kind === 'environment-node')
  assert.equal(environmentNode?.properties.distanceKm, 2.5)

  const zone = geojson.features.find((feature) => feature.properties.spectatorId === 'zone-a')
  assert.equal(zone?.properties.kind, 'spectator-zone')
  assert.equal(zone?.properties.label, 'Zona de público A')
  assert.equal(zone?.properties.description, 'Zona publicada por el organizador.')
  assert.deepEqual(zone?.geometry.coordinates, [-72.705, -37.23])

  const parkingPoint = geojson.features.find((feature) => feature.properties.spectatorId === 'parking-a')
  assert.equal(parkingPoint?.properties.kind, 'spectator-parking')
  assert.equal(parkingPoint?.properties.label, 'Parking A')

  const distanceMarker = geojson.features.find((feature) => feature.properties.kind === 'distance-marker')
  assert.equal(distanceMarker?.properties.label, 'KM 5')
  assert.equal(distanceMarker?.properties.distanceKm, 5)

  const arrow = geojson.features.find((feature) => feature.properties.kind === 'direction-arrow')
  assert.equal(arrow?.properties.bearingDeg, 42)

  const chip = geojson.features.find((feature) => feature.properties.kind === 'environment-chip')
  assert.equal(chip?.properties.label, 'KM 2.5 · 14 °C')
  assert.equal(chip?.properties.weatherMode, 'forecast')
})
