import assert from 'node:assert/strict'
import test from 'node:test'
import type { RallyScheduleStage, RallyStage, StageRouteReuse } from './rally.ts'
import { materializeTechnicalStages, withTechnicalAvailability } from './stageCatalog.ts'

const schedule = [
  { code: 'SS1', interactive: true },
  { code: 'SS2', interactive: false },
  { code: 'SS3', interactive: false },
  { code: 'SS4', interactive: false },
] as RallyScheduleStage[]

const technicalStages = [
  { code: 'SS1', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
  { code: 'SS2', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
  { code: 'SS3', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
] as RallyStage[]

test('withTechnicalAvailability derives app interactivity from loaded geometry, not schedule flags', () => {
  const result = withTechnicalAvailability(schedule, technicalStages)

  assert.deepEqual(result.filter((stage) => stage.interactive).map((stage) => stage.code), ['SS1', 'SS2', 'SS3'])
  assert.equal(result.find((stage) => stage.code === 'SS4')?.interactive, false)
})

test('materializeTechnicalStages reuses route geometry while preserving the repeated stage own schedule time and identity', () => {
  const sourceStage = {
    id: 'chile-2026-ss2-nuevo-rere-1',
    eventId: 'chile-2026',
    sequence: 2,
    code: 'SS2',
    name: 'Nuevo Rere 1',
    date: '2026-09-11',
    scheduledStart: '2026-09-11T09:48:00-03:00',
    distanceKm: 10.76,
    surface: 'unknown',
    geometryStatus: 'reconstructed',
    geometry: { type: 'LineString', coordinates: [[-72.63, -37.18], [-72.70, -37.13]] },
    provenance: {
      state: 'planned',
      sources: [{ label: 'Route source', url: 'https://example.com/route', accessedAt: '2026-08-29' }],
      note: 'Dense reference reconstruction.',
    },
  } as RallyStage
  const repeatedSchedule = [{
    eventId: 'chile-2026',
    sequence: 5,
    code: 'SS5',
    slug: 'ss5-nuevo-rere',
    name: 'Nuevo Rere 2',
    date: '2026-09-11',
    scheduledStart: '2026-09-11T16:04:00-03:00',
    distanceKm: 10.92,
    interactive: false,
    provenance: { state: 'planned', sources: [] },
  }] as RallyScheduleStage[]
  const reuse = [{
    stageCode: 'SS5',
    sourceStageCode: 'SS2',
    provenance: {
      state: 'planned',
      sources: [{ label: 'Repeat source', url: 'https://example.com/repeat', accessedAt: '2026-08-29' }],
      note: 'Same competitive route, second pass.',
    },
  }] as StageRouteReuse[]

  const result = materializeTechnicalStages(repeatedSchedule, [sourceStage], reuse)
  const repeated = result.find((stage) => stage.code === 'SS5')

  assert.equal(result.length, 2)
  assert.equal(repeated?.name, 'Nuevo Rere 2')
  assert.equal(repeated?.sequence, 5)
  assert.equal(repeated?.scheduledStart, '2026-09-11T16:04:00-03:00')
  assert.equal(repeated?.distanceKm, 10.76)
  assert.equal(repeated?.geometry, sourceStage.geometry)
  assert.equal(repeated?.geometryStatus, 'reconstructed')
  assert.ok(repeated?.provenance.sources.some((source) => source.url === 'https://example.com/repeat'))
})

test('materializeTechnicalStages fails closed when a reuse mapping references a missing source geometry', () => {
  const repeatedSchedule = [{
    eventId: 'chile-2026',
    sequence: 4,
    code: 'SS4',
    slug: 'ss4-turquia',
    name: 'Turquía 2',
    date: '2026-09-11',
    scheduledStart: '2026-09-11T15:09:00-03:00',
    distanceKm: 22.94,
    interactive: false,
    provenance: { state: 'planned', sources: [] },
  }] as RallyScheduleStage[]
  const reuse = [{
    stageCode: 'SS4',
    sourceStageCode: 'SS1',
    provenance: { state: 'planned', sources: [] },
  }] as StageRouteReuse[]

  assert.throws(
    () => materializeTechnicalStages(repeatedSchedule, [], reuse),
    /SS4.*SS1/i,
  )
})
