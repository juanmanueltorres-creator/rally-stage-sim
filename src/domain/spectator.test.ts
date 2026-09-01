import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSpectatorInfo } from './spectator.ts'
import type { StageSpectatorInfo } from './rally.ts'

const pointProvenance = {
  state: 'planned' as const,
  sources: [{ label: 'Organizer spectator map', url: 'https://example.com/map', accessedAt: '2026-08-30' }],
}

test('normalizeSpectatorInfo keeps missing stage logistics explicitly pending with empty spatial categories', () => {
  assert.deepEqual(normalizeSpectatorInfo(undefined, 'chile-2026-ss1-turquia-1'), {
    stageId: 'chile-2026-ss1-turquia-1',
    accessStatus: 'pending',
    spectatorZones: [],
    parking: [],
    accessPoints: [],
    noSpectatorZones: [],
    services: [],
    provenance: {
      state: 'planned',
      sources: [],
      note: 'No stage-specific official spectator logistics loaded yet.',
    },
  })
})

test('normalizeSpectatorInfo preserves sourced logistics and fills absent new categories with empty arrays', () => {
  const info: StageSpectatorInfo = {
    stageId: 'chile-2026-ss1-turquia-1',
    accessStatus: 'known',
    roadClosureText: 'Public access closes before competition begins.',
    spectatorZones: [{
      id: 'zone-a',
      label: 'Zona A',
      coordinate: [-72, -37],
      provenance: pointProvenance,
    }],
    parking: [],
    services: [],
    safetyNote: 'Use official spectator areas and follow organizer instructions.',
    provenance: {
      state: 'planned',
      sources: [{ label: 'Organizer notice', url: 'https://example.com', accessedAt: '2026-08-29' }],
    },
  }

  const result = normalizeSpectatorInfo(info, info.stageId)

  assert.deepEqual(result.spectatorZones, info.spectatorZones)
  assert.deepEqual(result.parking, [])
  assert.deepEqual(result.accessPoints, [])
  assert.deepEqual(result.noSpectatorZones, [])
  assert.deepEqual(result.provenance, info.provenance)
})

test('normalizeSpectatorInfo preserves explicit sourced official access and no-spectator points', () => {
  const info: StageSpectatorInfo = {
    stageId: 'chile-2026-ss1-turquia-1',
    accessStatus: 'known',
    spectatorZones: [],
    parking: [],
    accessPoints: [{ id: 'access-a', label: 'Acceso oficial A', coordinate: [-72, -37], provenance: pointProvenance }],
    noSpectatorZones: [{ id: 'no-a', label: 'No público A', coordinate: [-72.1, -37.1], provenance: pointProvenance }],
    services: [],
    provenance: { state: 'planned', sources: [] },
  }

  const result = normalizeSpectatorInfo(info, info.stageId)
  assert.equal(result.accessPoints?.length, 1)
  assert.equal(result.noSpectatorZones?.length, 1)
})

test('normalizeSpectatorInfo inherits event rules while never inheriting stage-specific geography', () => {
  const general: StageSpectatorInfo = {
    stageId: 'event-template',
    accessStatus: 'pending',
    roadClosureText: 'General roads close at 20:00 the day before.',
    roadClosureAt: '2026-09-10T20:00:00-03:00',
    exitRule: 'Exit after the Rastrillo in rally direction.',
    capacityNote: 'Access can close earlier if capacity is reached.',
    spectatorZones: [{ id: 'ss1-zone', label: 'SS1 only', coordinate: [-72, -37], provenance: pointProvenance }],
    parking: [{ id: 'ss1-parking', label: 'SS1 only', coordinate: [-72, -37], provenance: pointProvenance }],
    accessPoints: [{ id: 'ss1-access', label: 'SS1 access only', coordinate: [-72, -37], provenance: pointProvenance }],
    noSpectatorZones: [{ id: 'ss1-no', label: 'SS1 no-public only', coordinate: [-72, -37], provenance: pointProvenance }],
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
  assert.deepEqual(result.accessPoints, [])
  assert.deepEqual(result.noSpectatorZones, [])
  assert.match(result.provenance.note ?? '', /event-level/i)
})
