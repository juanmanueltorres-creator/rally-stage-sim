import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSpectatorInfo } from './spectator.ts'
import type { StageSpectatorInfo } from './rally.ts'

test('normalizeSpectatorInfo keeps missing stage logistics explicitly pending', () => {
  assert.deepEqual(normalizeSpectatorInfo(undefined, 'chile-2026-ss1-turquia-1'), {
    stageId: 'chile-2026-ss1-turquia-1',
    accessStatus: 'pending',
    spectatorZones: [],
    parking: [],
    services: [],
    provenance: {
      state: 'planned',
      sources: [],
      note: 'No stage-specific official spectator logistics loaded yet.',
    },
  })
})

test('normalizeSpectatorInfo preserves sourced logistics without inventing missing fields', () => {
  const info = {
    stageId: 'chile-2026-ss1-turquia-1',
    accessStatus: 'known' as const,
    roadClosureText: 'Public access closes before competition begins.',
    spectatorZones: [],
    parking: [],
    services: [],
    safetyNote: 'Use official spectator areas and follow organizer instructions.',
    provenance: {
      state: 'planned' as const,
      sources: [{ label: 'Organizer notice', url: 'https://example.com', accessedAt: '2026-08-29' }],
    },
  }

  assert.deepEqual(normalizeSpectatorInfo(info, info.stageId), info)
})

test('normalizeSpectatorInfo inherits sourced event rules while keeping stage-specific geography pending', () => {
  const general: StageSpectatorInfo = {
    stageId: 'event-template',
    accessStatus: 'pending',
    roadClosureText: 'General roads close at 20:00 the day before.',
    roadClosureAt: '2026-09-10T20:00:00-03:00',
    exitRule: 'Exit after the Rastrillo in rally direction.',
    capacityNote: 'Access can close earlier if capacity is reached.',
    spectatorZones: [{ id: 'ss1-zone', label: 'SS1 only', coordinate: [-72, -37] }],
    parking: [{ id: 'ss1-parking', label: 'SS1 only', coordinate: [-72, -37] }],
    services: [],
    safetyTrain: [{ id: 'zero', label: 'Auto 0', offsetMinutes: -10 }],
    safetyNote: 'Follow organizer instructions.',
    provenance: {
      state: 'planned',
      sources: [{ label: 'Organizer notice', url: 'https://example.com', accessedAt: '2026-08-29' }],
    },
  }

  const result = normalizeSpectatorInfo(undefined, 'chile-2026-ss2-nuevo-rere-1', general)

  assert.equal(result.stageId, 'chile-2026-ss2-nuevo-rere-1')
  assert.equal(result.roadClosureText, general.roadClosureText)
  assert.equal(result.exitRule, general.exitRule)
  assert.deepEqual(result.safetyTrain, general.safetyTrain)
  assert.deepEqual(result.spectatorZones, [])
  assert.deepEqual(result.parking, [])
  assert.match(result.provenance.note ?? '', /event-level/i)
})
