import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteNode } from './environmentNodes.ts'
import {
  buildOpenMeteoForecastUrl,
  fetchOpenMeteoForecast,
  normalizeOpenMeteoForecast,
} from './openMeteo.ts'

const nodes: RouteNode[] = [
  { id: 'start', role: 'start', distanceKm: 0, coordinate: [-72.72, -37.25] },
  { id: 'km-2.5', role: 'context', distanceKm: 2.5, coordinate: [-72.71, -37.235] },
]

const payload = [
  {
    elevation: 145,
    hourly: {
      time: ['2026-09-11T08:00', '2026-09-11T09:00'],
      temperature_2m: [9.5, 10.8],
      wind_speed_10m: [8, 11],
      wind_direction_10m: [170, 185],
      wind_gusts_10m: [15, 19],
      precipitation: [0, 0.2],
    },
  },
  {
    elevation: 212,
    hourly: {
      time: ['2026-09-11T08:00', '2026-09-11T09:00'],
      temperature_2m: [8.8, 9.9],
      wind_speed_10m: [10, 13],
      wind_direction_10m: [175, 191],
      wind_gusts_10m: [18, 22],
      precipitation: [0, 0.4],
    },
  },
]

test('normalizeOpenMeteoForecast selects the nearest hourly forecast for each route node', () => {
  const snapshots = normalizeOpenMeteoForecast(nodes, payload, '2026-09-11T08:53:00-03:00')

  assert.equal(snapshots.length, 2)
  assert.equal(snapshots[0].validAt, '2026-09-11T09:00')
  assert.equal(snapshots[0].elevationM, 145)
  assert.equal(snapshots[0].temperatureC, 10.8)
  assert.equal(snapshots[0].windSpeedKmh, 11)
  assert.equal(snapshots[0].windDirectionDeg, 185)
  assert.equal(snapshots[0].windGustKmh, 19)
  assert.equal(snapshots[0].precipitationMm, 0.2)
  assert.equal(snapshots[1].node.id, 'km-2.5')
  assert.equal(snapshots[1].elevationM, 212)
  assert.equal(snapshots[1].temperatureC, 9.9)
})

test('buildOpenMeteoForecastUrl requests all nodes for the stage date in local time', () => {
  const requestUrl = new URL(buildOpenMeteoForecastUrl(nodes, '2026-09-11T08:53:00-03:00', 'America/Santiago'))

  assert.equal(requestUrl.origin, 'https://api.open-meteo.com')
  assert.equal(requestUrl.pathname, '/v1/forecast')
  assert.equal(requestUrl.searchParams.get('latitude'), '-37.25,-37.235')
  assert.equal(requestUrl.searchParams.get('longitude'), '-72.72,-72.71')
  assert.equal(requestUrl.searchParams.get('timezone'), 'America/Santiago')
  assert.equal(requestUrl.searchParams.get('forecast_days'), '16')
  assert.equal(requestUrl.searchParams.get('start_date'), '2026-09-11')
  assert.equal(requestUrl.searchParams.get('end_date'), '2026-09-11')
  assert.equal(
    requestUrl.searchParams.get('hourly'),
    'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation',
  )
})

test('fetchOpenMeteoForecast requests and normalizes the multi-location payload', async () => {
  let requestedUrl = ''
  const fakeFetch = async (url: string) => {
    requestedUrl = url
    return {
      ok: true,
      json: async () => payload,
    }
  }

  const snapshots = await fetchOpenMeteoForecast(
    nodes,
    '2026-09-11T08:53:00-03:00',
    'America/Santiago',
    fakeFetch,
  )

  assert.ok(requestedUrl.startsWith('https://api.open-meteo.com/v1/forecast?'))
  assert.equal(snapshots[0].temperatureC, 10.8)
  assert.equal(snapshots[1].windGustKmh, 22)
})
