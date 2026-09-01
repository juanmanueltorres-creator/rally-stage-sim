import assert from 'node:assert/strict'
import test from 'node:test'
import type { StageLineString } from '../domain/rally.ts'
import { fleetSnapshot } from './fleet.ts'
import { buildPlannedStartGrid } from './startGrid.ts'

const line: StageLineString = {
  type: 'LineString',
  coordinates: [
    [-72.72, -37.25],
    [-72.70, -37.20],
  ],
}

test('fleetSnapshot applies one virtual clock to staggered vehicle starts', () => {
  const stageStartMs = Date.parse('2026-09-11T08:53:00-03:00')
  const grid = buildPlannedStartGrid(3, 180)
  const snapshots = fleetSnapshot(line, grid, stageStartMs, 826_400, stageStartMs + 200_000)

  assert.equal(snapshots[0].simulationId, 'SIM-01')
  assert.equal(snapshots[0].status, 'running')
  assert.ok(snapshots[0].progress > 0.24 && snapshots[0].progress < 0.25)

  assert.equal(snapshots[1].simulationId, 'SIM-02')
  assert.equal(snapshots[1].status, 'running')
  assert.ok(snapshots[1].progress > 0.02 && snapshots[1].progress < 0.03)

  assert.equal(snapshots[2].simulationId, 'SIM-03')
  assert.equal(snapshots[2].status, 'waiting')
  assert.equal(snapshots[2].progress, 0)
})
