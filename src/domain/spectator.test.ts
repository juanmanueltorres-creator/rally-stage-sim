import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSpectatorInfo } from './spectator.ts'

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
