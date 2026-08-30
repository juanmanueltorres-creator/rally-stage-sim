import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteNode } from './environmentNodes.ts'
import type { RouteEnvironmentSnapshot } from './openMeteo.ts'
import {
  HISTORICAL_REFERENCE_YEARS,
  aggregateHistoricalReference,
  buildHistoricalWeatherUrl,
  fetchHistoricalReference,
} from './historicalWeather.ts'

const nodes: RouteNode[] = [
  { id: 'start', role: 'start', distanceKm: 0, coordinate: [-72.7, -37.2] },
]

function snapshot(
  temperatureC: number | null,
  windGustKmh: number | null,
  precipitationMm: number | null,
  elevationM: number | null,
  windSpeedKmh: number | null = 10,
): RouteEnvironmentSnapshot[] {
  return [{
    node: nodes[0],
    validAt: '2021-09-11T09:00',
    elevationM,
    temperatureC,
    windSpeedKmh,
    windDirectionDeg: 180,
    windGustKmh,
    precipitationMm,
  }]
}

test('buildHistoricalWeatherUrl targets one historical year with the same month/day and timezone', () => {
  const url = new URL(buildHistoricalWeatherUrl(nodes, '2026-09-11T08:53:00-03:00', 'America/Santiago', 2023))

  assert.equal(url.origin, 'https://archive-api.open-meteo.com')
  assert.equal(url.pathname, '/v1/archive')
  assert.equal(url.searchParams.get('start_date'), '2023-09-11')
  assert.equal(url.searchParams.get('end_date'), '2023-09-11')
  assert.equal(url.searchParams.get('timezone'), 'America/Santiago')
  assert.equal(url.searchParams.get('models'), 'era5_seamless')
  assert.match(url.searchParams.get('hourly') ?? '', /temperature_2m/)
  assert.match(url.searchParams.get('hourly') ?? '', /wind_gusts_10m/)
})

test('aggregateHistoricalReference uses medians with at least three valid years and never linearly aggregates wind direction', () => {
  const result = aggregateHistoricalReference([
    snapshot(10, 20, 0, 100, 5),
    snapshot(12, 22, 1, 110, 7),
    snapshot(14, 24, 2, 120, 9),
    snapshot(16, 26, 3, 130, 11),
    snapshot(18, 28, 4, 140, 13),
  ])

  assert.equal(result[0].temperatureC, 14)
  assert.equal(result[0].windSpeedKmh, 9)
  assert.equal(result[0].windGustKmh, 24)
  assert.equal(result[0].precipitationMm, 2)
  assert.equal(result[0].elevationM, 120)
  assert.equal(result[0].windDirectionDeg, null)
})

test('aggregateHistoricalReference keeps a variable unavailable when fewer than three years are finite', () => {
  const result = aggregateHistoricalReference([
    snapshot(null, 20, null, 100),
    snapshot(null, 22, null, 100),
    snapshot(null, 24, 1, 100),
    snapshot(16, 26, 2, 100),
    snapshot(18, 28, null, 100),
  ])

  assert.equal(result[0].temperatureC, null)
  assert.equal(result[0].precipitationMm, null)
  assert.equal(result[0].windGustKmh, 24)
})

test('fetchHistoricalReference requests exactly 2021-2025 and returns the same-date same-hour median', async () => {
  const requestedYears: number[] = []

  const result = await fetchHistoricalReference(
    nodes,
    '2026-09-11T08:53:00-03:00',
    'America/Santiago',
    async (url) => {
      const parsed = new URL(url)
      const year = Number(parsed.searchParams.get('start_date')?.slice(0, 4))
      requestedYears.push(year)
      const index = HISTORICAL_REFERENCE_YEARS.indexOf(year)
      const temperature = 10 + index * 2

      return {
        ok: true,
        async json() {
          return {
            elevation: 120,
            hourly: {
              time: [`${year}-09-11T09:00`],
              temperature_2m: [temperature],
              wind_speed_10m: [10 + index],
              wind_direction_10m: [180],
              wind_gusts_10m: [20 + index * 2],
              precipitation: [index],
            },
          }
        },
      }
    },
  )

  assert.deepEqual(requestedYears, HISTORICAL_REFERENCE_YEARS)
  assert.equal(result[0].temperatureC, 14)
  assert.equal(result[0].windGustKmh, 24)
  assert.equal(result[0].validAt, '2026-09-11T09:00')
  assert.equal(result[0].windDirectionDeg, null)
})
