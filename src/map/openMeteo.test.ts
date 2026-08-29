import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteNode } from './environmentNodes.ts'
import { normalizeOpenMeteoForecast } from './openMeteo.ts'

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
