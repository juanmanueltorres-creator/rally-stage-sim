import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteWeatherComparison } from '../map/weatherComparison.ts'
import { presentPassComparison } from './passComparison.ts'

test('presentPassComparison formats second-pass deltas and strongest route shift without implying road condition', () => {
  const comparison: RouteWeatherComparison = {
    meanTemperatureDeltaC: 4.25,
    maxGustDeltaKmh: 11,
    maxPrecipitationDeltaMm: -0.4,
    strongestTemperatureShift: {
      nodeId: 'km-7.5',
      distanceKm: 7.5,
      deltaC: 5.1,
    },
  }

  assert.deepEqual(presentPassComparison(comparison), {
    temperature: '+4.3 °C',
    gusts: '+11 km/h',
    precipitation: '−0.4 mm',
    strongestShift: 'KM 7.5 · +5.1 °C',
  })
})

test('presentPassComparison keeps missing model comparisons explicit', () => {
  assert.deepEqual(presentPassComparison({
    meanTemperatureDeltaC: null,
    maxGustDeltaKmh: null,
    maxPrecipitationDeltaMm: null,
    strongestTemperatureShift: null,
  }), {
    temperature: '—',
    gusts: '—',
    precipitation: '—',
    strongestShift: '—',
  })
})
