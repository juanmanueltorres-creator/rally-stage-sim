import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteEnvironmentSnapshot } from './openMeteo.ts'
import { compareRouteWeather } from './weatherComparison.ts'

function snapshot(
  id: string,
  distanceKm: number,
  temperatureC: number | null,
  windGustKmh: number | null,
  precipitationMm: number | null,
): RouteEnvironmentSnapshot {
  return {
    node: {
      id,
      role: id === 'start' ? 'start' : id === 'finish' ? 'finish' : 'context',
      distanceKm,
      coordinate: [-72.7, -37.1],
    },
    validAt: '2026-09-11T09:00',
    elevationM: 100,
    temperatureC,
    windSpeedKmh: null,
    windDirectionDeg: null,
    windGustKmh,
    precipitationMm,
  }
}

test('compareRouteWeather reports second-pass deltas against first pass and locates the strongest thermal shift', () => {
  const firstPass = [
    snapshot('start', 0, 10, 20, 0.2),
    snapshot('km-2.5', 2.5, 12, 25, 0.1),
    snapshot('finish', 5, 11, 22, 0),
  ]
  const secondPass = [
    snapshot('start', 0, 15, 18, 0),
    snapshot('km-2.5', 2.5, 16, 30, 0),
    snapshot('finish', 5, 14, 28, 0.1),
  ]

  assert.deepEqual(compareRouteWeather(firstPass, secondPass), {
    meanTemperatureDeltaC: 4,
    maxGustDeltaKmh: 5,
    maxPrecipitationDeltaMm: -0.1,
    strongestTemperatureShift: {
      nodeId: 'start',
      distanceKm: 0,
      deltaC: 5,
    },
  })
})

test('compareRouteWeather keeps unavailable comparisons explicit instead of treating missing values as zero', () => {
  const firstPass = [snapshot('start', 0, null, 20, null)]
  const secondPass = [snapshot('start', 0, 15, null, null)]

  assert.deepEqual(compareRouteWeather(firstPass, secondPass), {
    meanTemperatureDeltaC: null,
    maxGustDeltaKmh: null,
    maxPrecipitationDeltaMm: null,
    strongestTemperatureShift: null,
  })
})
