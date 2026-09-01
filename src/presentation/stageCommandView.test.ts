import assert from 'node:assert/strict'
import test from 'node:test'
import type { StageSpectatorInfo } from '../domain/rally.ts'
import {
  presentCommandClosure,
  presentCommandPublicAccess,
  presentCommandWeather,
} from './stageCommandView.ts'

function spectator(overrides: Partial<StageSpectatorInfo> = {}): StageSpectatorInfo {
  return {
    stageId: 'stage-1',
    accessStatus: 'pending',
    spectatorZones: [],
    parking: [],
    accessPoints: [],
    noSpectatorZones: [],
    services: [],
    provenance: { state: 'planned', sources: [] },
    ...overrides,
  }
}

test('presentCommandWeather keeps forecast and historical reference explicit', () => {
  assert.equal(presentCommandWeather('ready', 'forecast'), 'FORECAST')
  assert.equal(presentCommandWeather('ready', 'historical-reference'), 'HISTORICAL REF · 2021–2025')
  assert.equal(presentCommandWeather('loading', null), 'RESOLVING WEATHER')
  assert.equal(presentCommandWeather('unavailable', null), 'WEATHER UNAVAILABLE')
})

test('presentCommandClosure formats closure time in the event timezone', () => {
  assert.equal(
    presentCommandClosure(
      spectator({ roadClosureAt: '2026-09-10T20:00:00-03:00' }),
      'America/Santiago',
    ),
    '20:00 PREV',
  )
})

test('presentCommandPublicAccess requires both coordinate and provenance', () => {
  assert.equal(presentCommandPublicAccess(spectator()), 'PENDING OFFICIAL POINTS')

  assert.equal(
    presentCommandPublicAccess(spectator({
      accessPoints: [{
        id: 'official-access-1',
        label: 'Acceso oficial',
        coordinate: [-72.7, -37.2],
        provenance: {
          state: 'planned',
          sources: [{
            label: 'Organizer map',
            url: 'https://example.com/map',
            accessedAt: '2026-08-30',
          }],
        },
      }],
    })),
    'OFFICIAL POINTS',
  )
})
