import assert from 'node:assert/strict'
import test from 'node:test'
import type { RouteNode } from './environmentNodes.ts'
import type { RouteEnvironmentSnapshot } from './openMeteo.ts'
import { buildEnvironmentChips } from './environmentChips.ts'

const nodes: RouteNode[] = [
  { id: 'start', role: 'start', distanceKm: 0, coordinate: [-72.7, -37.2] },
  { id: 'q1', role: 'context', distanceKm: 5, coordinate: [-72.68, -37.2] },
  { id: 'mid', role: 'context', distanceKm: 10, coordinate: [-72.66, -37.2] },
  { id: 'q3', role: 'context', distanceKm: 15, coordinate: [-72.64, -37.2] },
  { id: 'finish', role: 'finish', distanceKm: 20, coordinate: [-72.62, -37.2] },
]

function snapshot(node: RouteNode, overrides: Partial<RouteEnvironmentSnapshot> = {}): RouteEnvironmentSnapshot {
  return {
    node,
    validAt: '2026-09-11T09:00',
    elevationM: 200,
    temperatureC: 14,
    windSpeedKmh: 10,
    windDirectionDeg: 180,
    windGustKmh: 25,
    precipitationMm: 0,
    ...overrides,
  }
}

test('buildEnvironmentChips creates at most five default-visible labels from representative route nodes', () => {
  const chips = buildEnvironmentChips(nodes.map((node) => snapshot(node)), 'forecast', 5)

  assert.equal(chips.length, 5)
  assert.equal(chips[0].nodeId, 'start')
  assert.equal(chips.at(-1)?.nodeId, 'finish')
  assert.ok(chips.every((chip) => chip.weatherMode === 'forecast'))
  assert.ok(chips.every((chip) => /°C/.test(chip.label)))
})

test('buildEnvironmentChips falls through temperature, gust, precipitation, then elevation without inventing zero', () => {
  const chips = buildEnvironmentChips([
    snapshot(nodes[0], { temperatureC: null, windGustKmh: 31 }),
    snapshot(nodes[1], { temperatureC: null, windGustKmh: null, precipitationMm: 1.2 }),
    snapshot(nodes[2], { temperatureC: null, windGustKmh: null, precipitationMm: null, elevationM: 420 }),
    snapshot(nodes[3], { temperatureC: null, windGustKmh: null, precipitationMm: null, elevationM: null }),
    snapshot(nodes[4], { temperatureC: 9.5 }),
  ], 'historical-reference', 5)

  assert.match(chips[0].label, /GUST 31/)
  assert.match(chips[1].label, /1\.2 mm/)
  assert.match(chips[2].label, /420 m/)
  assert.ok(!chips.some((chip) => chip.nodeId === 'q3'))
  assert.match(chips.at(-1)?.label ?? '', /9\.5 °C/)
})
