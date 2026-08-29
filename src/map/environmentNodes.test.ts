import assert from 'node:assert/strict'
import test from 'node:test'
import type { StageLineString } from '../domain/rally.ts'
import { buildRouteNodes } from './environmentNodes.ts'

const line: StageLineString = {
  type: 'LineString',
  coordinates: [
    [0, 0],
    [0.1, 0],
  ],
}

test('buildRouteNodes includes start, fixed spacing nodes and finish', () => {
  const nodes = buildRouteNodes(line, 2.5)

  assert.equal(nodes.length, 6)
  assert.equal(nodes[0].role, 'start')
  assert.equal(nodes[0].distanceKm, 0)
  assert.deepEqual(nodes.slice(1, -1).map((node) => node.distanceKm), [2.5, 5, 7.5, 10])
  assert.equal(nodes.at(-1)?.role, 'finish')
  assert.ok(Math.abs((nodes.at(-1)?.distanceKm ?? 0) - 11.12) < 0.02)
})
