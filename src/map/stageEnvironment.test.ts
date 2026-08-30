import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteNode } from './environmentNodes.ts'
import type { RouteEnvironmentSnapshot } from './openMeteo.ts'
import {
  fetchStageEnvironment,
  weatherModesComparable,
} from './stageEnvironment.ts'

const nodes: RouteNode[] = [
  { id: 'start', role: 'start', distanceKm: 0, coordinate: [-72.7, -37.2] },
]

const forecastSnapshots: RouteEnvironmentSnapshot[] = [{
  node: nodes[0],
  validAt: '2026-09-11T09:00',
  elevationM: 100,
  temperatureC: 15,
  windSpeedKmh: 10,
  windDirectionDeg: 180,
  windGustKmh: 20,
  precipitationMm: 0,
}]

const historicalSnapshots: RouteEnvironmentSnapshot[] = [{
  ...forecastSnapshots[0],
  temperatureC: 12,
  windDirectionDeg: null,
}]

test('fetchStageEnvironment prefers forecast and does not call historical fallback when forecast succeeds', async () => {
  let historicalCalls = 0

  const result = await fetchStageEnvironment(nodes, '2026-09-11T08:53:00-03:00', 'America/Santiago', {
    forecast: async () => forecastSnapshots,
    historical: async () => {
      historicalCalls += 1
      return historicalSnapshots
    },
  })

  assert.equal(result.mode, 'forecast')
  assert.equal(result.sourceLabel, 'FORECAST · OPEN-METEO')
  assert.equal(result.snapshots, forecastSnapshots)
  assert.equal(historicalCalls, 0)
})

test('fetchStageEnvironment falls back to the deterministic historical reference when forecast cannot load', async () => {
  const result = await fetchStageEnvironment(nodes, '2026-09-11T08:53:00-03:00', 'America/Santiago', {
    forecast: async () => {
      throw new Error('outside forecast horizon')
    },
    historical: async () => historicalSnapshots,
  })

  assert.equal(result.mode, 'historical-reference')
  assert.equal(result.sourceLabel, 'HISTORICAL REFERENCE · 2021–2025')
  assert.match(result.methodologyNote ?? '', /median/i)
  assert.match(result.methodologyNote ?? '', /not a forecast/i)
})

test('fetchStageEnvironment fails when both forecast and historical reference fail', async () => {
  await assert.rejects(
    fetchStageEnvironment(nodes, '2026-09-11T08:53:00-03:00', 'America/Santiago', {
      forecast: async () => { throw new Error('forecast unavailable') },
      historical: async () => { throw new Error('history unavailable') },
    }),
    /weather unavailable/i,
  )
})

test('weatherModesComparable only allows the same evidence mode', () => {
  assert.equal(weatherModesComparable('forecast', 'forecast'), true)
  assert.equal(weatherModesComparable('historical-reference', 'historical-reference'), true)
  assert.equal(weatherModesComparable('forecast', 'historical-reference'), false)
})
