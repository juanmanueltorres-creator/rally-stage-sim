import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPlannedStartGrid } from './startGrid.ts'

test('buildPlannedStartGrid creates stable simulated ids at fixed start offsets', () => {
  const grid = buildPlannedStartGrid(4, 180)

  assert.deepEqual(grid, [
    { simulationId: 'SIM-01', startOffsetSeconds: 0 },
    { simulationId: 'SIM-02', startOffsetSeconds: 180 },
    { simulationId: 'SIM-03', startOffsetSeconds: 360 },
    { simulationId: 'SIM-04', startOffsetSeconds: 540 },
  ])
})

test('buildPlannedStartGrid rejects invalid fleet configuration', () => {
  assert.throws(() => buildPlannedStartGrid(0, 180), /positive integer/)
  assert.throws(() => buildPlannedStartGrid(2, 0), /positive/)
})
