import assert from 'node:assert/strict'
import test from 'node:test'
import { presentStageDistance } from './stageDistance.ts'

test('presentStageDistance keeps one value when schedule and technical source agree', () => {
  assert.deepEqual(presentStageDistance(22.94, 22.94), {
    primary: '22.94 km',
    technical: null,
  })
})

test('presentStageDistance exposes both values instead of silently reconciling a discrepancy', () => {
  assert.deepEqual(presentStageDistance(10.92, 10.76), {
    primary: '10.92 km · schedule',
    technical: '10.76 km · WRC technical source',
  })
})
