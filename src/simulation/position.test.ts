import assert from 'node:assert/strict'
import test from 'node:test'
import type { StageLineString } from '../domain/rally.ts'
import { positionAlongLine } from './position.ts'

const line: StageLineString = {
  type: 'LineString',
  coordinates: [
    [0, 0],
    [0.1, 0],
  ],
}

test('positionAlongLine returns the route coordinate for normalized progress', () => {
  const midpoint = positionAlongLine(line, 0.5)
  const afterFinish = positionAlongLine(line, 1.5)

  assert.ok(Math.abs(midpoint[0] - 0.05) < 0.0001)
  assert.ok(Math.abs(midpoint[1]) < 0.0001)
  assert.deepEqual(afterFinish, [0.1, 0])
})
