import assert from 'node:assert/strict'
import test from 'node:test'
import type { StageLineString } from '../domain/rally.ts'
import { buildStageGeoJson } from './stageGeoJson.ts'

const line: StageLineString = {
  type: 'LineString',
  coordinates: [
    [-72.72, -37.25],
    [-72.70, -37.22],
  ],
}

test('buildStageGeoJson returns route and simulated vehicle features', () => {
  const geojson = buildStageGeoJson(line, [-72.71, -37.235], 'reconstructed')

  assert.equal(geojson.type, 'FeatureCollection')
  assert.equal(geojson.features.length, 2)
  assert.equal(geojson.features[0].geometry.type, 'LineString')
  assert.deepEqual(geojson.features[0].geometry.coordinates, line.coordinates)
  assert.equal(geojson.features[0].properties.kind, 'stage-route')
  assert.equal(geojson.features[0].properties.geometryStatus, 'reconstructed')
  assert.equal(geojson.features[1].geometry.type, 'Point')
  assert.deepEqual(geojson.features[1].geometry.coordinates, [-72.71, -37.235])
  assert.equal(geojson.features[1].properties.kind, 'simulated-vehicle')
})
