import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteEnvironmentSnapshot } from './openMeteo.ts'
import { presentEnvironmentSnapshot } from './environmentView.ts'

const snapshot: RouteEnvironmentSnapshot = {
  node: {
    id: 'km-2.5',
    role: 'context',
    distanceKm: 2.5,
    coordinate: [-72.71, -37.235],
  },
  validAt: '2026-09-11T09:00',
  elevationM: 212,
  temperatureC: 9.9,
  windSpeedKmh: 13,
  windDirectionDeg: 191,
  windGustKmh: 22,
  precipitationMm: 0.4,
}

test('presentEnvironmentSnapshot formats route position and modelled values', () => {
  assert.deepEqual(presentEnvironmentSnapshot(snapshot), {
    position: 'KM 2.5',
    temperature: '9.9 °C',
    wind: '13 km/h · 191°',
    gust: 'G 22 km/h',
    elevation: '212 m',
    precipitation: '0.4 mm',
    validAt: '09:00',
  })
})

test('presentEnvironmentSnapshot labels terminal nodes and keeps unavailable values explicit', () => {
  const terminal = presentEnvironmentSnapshot({
    ...snapshot,
    node: { ...snapshot.node, id: 'finish', role: 'finish', distanceKm: 22.9 },
    temperatureC: null,
    windDirectionDeg: null,
  })

  assert.equal(terminal.position, 'FINISH')
  assert.equal(terminal.temperature, '—')
  assert.equal(terminal.wind, '13 km/h')
})
