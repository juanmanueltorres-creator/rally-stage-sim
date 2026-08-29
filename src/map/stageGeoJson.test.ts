import assert from 'node:assert/strict'
import test from 'node:test'
import type { StageLineString } from '../domain/rally.ts'
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

test('buildStageGeoJson returns route, vehicle, start, context and finish features', () => {
  const geojson = buildStageGeoJson(line, [-72.71, -37.235], 'reconstructed', nodes)

  assert.equal(geojson.type, 'FeatureCollection')
  assert.equal(geojson.features.length, 5)
  assert.equal(geojson.features[0].geometry.type, 'LineString')
  assert.deepEqual(geojson.features[0].geometry.coordinates, line.coordinates)
  assert.equal(geojson.features[0].properties.kind, 'stage-route')
  assert.equal(geojson.features[0].properties.geometryStatus, 'reconstructed')
  assert.equal(geojson.features[1].geometry.type, 'Point')
  assert.deepEqual(geojson.features[1].geometry.coordinates, [-72.71, -37.235])
  assert.equal(geojson.features[1].properties.kind, 'simulated-vehicle')
  assert.equal(geojson.features[2].properties.kind, 'stage-start')
  assert.equal(geojson.features[3].properties.kind, 'environment-node')
  assert.equal(geojson.features[3].properties.distanceKm, 2.5)
  assert.equal(geojson.features[4].properties.kind, 'stage-finish')
})
