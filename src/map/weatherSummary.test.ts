import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteEnvironmentSnapshot } from './openMeteo.ts'
import { summarizeRouteWeather } from './weatherSummary.ts'

function snapshot(
  id: string,
  distanceKm: number,
  values: Partial<RouteEnvironmentSnapshot>,
): RouteEnvironmentSnapshot {
  return {
    node: {
      id,
      role: id === 'start' ? 'start' : id === 'finish' ? 'finish' : 'context',
      distanceKm,
      coordinate: [-72.7, -37.2],
    },
    validAt: '2026-09-11T09:00',
    elevationM: null,
    temperatureC: null,
    windSpeedKmh: null,
    windDirectionDeg: null,
    windGustKmh: null,
    precipitationMm: null,
    ...values,
  }
}

test('summarizeRouteWeather derives route-wide ranges and maxima from the same node snapshots', () => {
  const summary = summarizeRouteWeather([
    snapshot('start', 0, {
      temperatureC: 11.2,
      windGustKmh: 18,
      precipitationMm: 0,
      elevationM: 96,
    }),
    snapshot('km-12.5', 12.5, {
      temperatureC: 14.8,
      windGustKmh: 31,
      precipitationMm: 1.8,
      elevationM: 271,
    }),
    snapshot('finish', 22.94, {
      temperatureC: 13.1,
      windGustKmh: 24,
      precipitationMm: 0.4,
      elevationM: 182,
    }),
  ])

  assert.deepEqual(summary, {
    temperatureMinC: 11.2,
    temperatureMaxC: 14.8,
    maxGustKmh: 31,
    maxPrecipitationMm: 1.8,
    elevationMinM: 96,
    elevationMaxM: 271,
    validAt: '2026-09-11T09:00',
  })
})

test('summarizeRouteWeather ignores null values and keeps unavailable metrics explicit', () => {
  const summary = summarizeRouteWeather([
    snapshot('start', 0, { temperatureC: 12, elevationM: 100 }),
    snapshot('finish', 22.94, { temperatureC: null, elevationM: null }),
  ])

  assert.deepEqual(summary, {
    temperatureMinC: 12,
    temperatureMaxC: 12,
    maxGustKmh: null,
    maxPrecipitationMm: null,
    elevationMinM: 100,
    elevationMaxM: 100,
    validAt: '2026-09-11T09:00',
  })
})

test('summarizeRouteWeather returns an explicit empty summary when no forecast is available', () => {
  assert.deepEqual(summarizeRouteWeather([]), {
    temperatureMinC: null,
    temperatureMaxC: null,
    maxGustKmh: null,
    maxPrecipitationMm: null,
    elevationMinM: null,
    elevationMaxM: null,
    validAt: null,
  })
})
