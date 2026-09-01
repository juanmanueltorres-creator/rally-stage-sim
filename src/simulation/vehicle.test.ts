import assert from 'node:assert/strict'
import test from 'node:test'
import type { StageLineString } from '../domain/rally.ts'
import { vehicleSnapshot } from './vehicle.ts'

const line: StageLineString = {
  type: 'LineString',
  coordinates: [
    [0, 0],
    [0.1, 0],
  ],
}

test('vehicleSnapshot exposes waiting, running and finished states on the route', () => {
  const startMs = 1_000
  const durationMs = 10_000

  const waiting = vehicleSnapshot(line, startMs, durationMs, 500)
  const running = vehicleSnapshot(line, startMs, durationMs, 6_000)
  const finished = vehicleSnapshot(line, startMs, durationMs, 12_000)

  assert.equal(waiting.status, 'waiting')
  assert.equal(waiting.progress, 0)
  assert.deepEqual(waiting.coordinate, [0, 0])

  assert.equal(running.status, 'running')
  assert.ok(Math.abs(running.progress - 0.5) < 0.0001)
  assert.ok(Math.abs(running.coordinate[0] - 0.05) < 0.0001)

  assert.equal(finished.status, 'finished')
  assert.equal(finished.progress, 1)
  assert.deepEqual(finished.coordinate, [0.1, 0])
})
