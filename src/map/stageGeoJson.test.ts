import assert from 'node:assert/strict'
import test from 'node:test'
import type { SpectatorPoint, StageLineString } from '../domain/rally.ts'
import type { RouteNode } from './environmentNodes.ts'
import { buildStageGeoJson } from './stageGeoJson.ts'

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

test('buildStageGeoJson returns route, simulated cars, environmental nodes and sourced spectator points', () => {
  const geojson = buildStageGeoJson(line, vehicles, 'reconstructed', nodes, {
    spectatorZones,
    parking,
  })

  assert.equal(geojson.type, 'FeatureCollection')
  assert.equal(geojson.features.length, 8)
  assert.equal(geojson.features[0].geometry.type, 'LineString')
  assert.deepEqual(geojson.features[0].geometry.coordinates, line.coordinates)
  assert.equal(geojson.features[0].properties.kind, 'stage-route')
  assert.equal(geojson.features[0].properties.geometryStatus, 'reconstructed')

  const sim01 = geojson.features.find((feature) => feature.properties.simulationId === 'SIM-01')
  assert.equal(sim01?.properties.kind, 'simulated-vehicle')
  assert.equal(sim01?.properties.status, 'running')
  assert.equal(sim01?.properties.progress, 0.5)

  const environmentNode = geojson.features.find((feature) => feature.properties.nodeId === 'km-2.5')
  assert.equal(environmentNode?.properties.kind, 'environment-node')
  assert.equal(environmentNode?.properties.distanceKm, 2.5)

  const zone = geojson.features.find((feature) => feature.properties.spectatorId === 'zone-a')
  assert.equal(zone?.properties.kind, 'spectator-zone')
  assert.equal(zone?.properties.label, 'Zona de público A')
  assert.equal(zone?.properties.description, 'Zona publicada por el organizador.')
  assert.deepEqual(zone?.geometry.coordinates, [-72.705, -37.23])

  const parkingPoint = geojson.features.find((feature) => feature.properties.spectatorId === 'parking-a')
  assert.equal(parkingPoint?.properties.kind, 'spectator-parking')
  assert.equal(parkingPoint?.properties.label, 'Parking A')
})
