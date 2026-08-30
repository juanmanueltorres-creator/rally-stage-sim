import assert from 'node:assert/strict'
import test from 'node:test'
import type { RallyScheduleStage } from '../domain/rally.ts'
import type { StageWeatherSummary } from '../map/weatherSummary.ts'
import { describeStageConditions, groupScheduleByDay, totalCompetitiveKm } from './stageExperience.ts'

const source = {
  state: 'planned' as const,
  sources: [],
}

const stages: RallyScheduleStage[] = [
  {
    eventId: 'chile-2026', sequence: 1, code: 'SS1', slug: 'ss1-turquia', name: 'Turquía 1',
    date: '2026-09-11', scheduledStart: '2026-09-11T08:53:00-03:00', distanceKm: 22.94,
    interactive: true, provenance: source,
  },
  {
    eventId: 'chile-2026', sequence: 7, code: 'SS7', slug: 'ss7-pelun', name: 'Pelún 1',
    date: '2026-09-12', scheduledStart: '2026-09-12T09:08:00-03:00', distanceKm: 15.65,
    interactive: false, provenance: source,
  },
  {
    eventId: 'chile-2026', sequence: 13, code: 'SS13', slug: 'ss13-carampangue', name: 'Carampangue 1',
    date: '2026-09-13', scheduledStart: '2026-09-13T09:00:00-03:00', distanceKm: 26.82,
    interactive: false, provenance: source,
  },
]

const summary: StageWeatherSummary = {
  temperatureMinC: 11.2,
  temperatureMaxC: 14.8,
  maxGustKmh: 31,
  maxPrecipitationMm: 1.8,
  elevationMinM: 96,
  elevationMaxM: 271,
  validAt: '2026-09-11T09:00',
}

test('groupScheduleByDay keeps rally stages ordered under human-readable day labels', () => {
  assert.deepEqual(groupScheduleByDay(stages).map((group) => ({ label: group.label, codes: group.stages.map((stage) => stage.code) })), [
    { label: 'VIERNES 11', codes: ['SS1'] },
    { label: 'SÁBADO 12', codes: ['SS7'] },
    { label: 'DOMINGO 13', codes: ['SS13'] },
  ])
})

test('totalCompetitiveKm sums the schedule snapshot rather than hardcoding the rally total', () => {
  assert.equal(totalCompetitiveKm(stages), 65.41)
})

test('describeStageConditions reports forecast signals without claiming actual grip or road state', () => {
  assert.deepEqual(describeStageConditions(summary, 'forecast'), [
    'Señal de precipitación presente en el recorrido: hasta 1.8 mm en un nodo horario.',
    'Ráfagas modeladas de hasta 31 km/h.',
    'Diferencia térmica modelada de 3.6 °C a lo largo del tramo.',
    'Desnivel de contexto de 175 m entre los nodos muestreados.',
  ])
})

test('describeStageConditions labels historical values as reference rather than forecast or observation', () => {
  const lines = describeStageConditions(summary, 'historical-reference')
  const joined = lines.join(' ')

  assert.match(joined, /referencia histórica/i)
  assert.doesNotMatch(joined, /pronóstico para el día/i)
  assert.doesNotMatch(joined, /observad/i)
})

test('describeStageConditions stays explicit when weather is unavailable', () => {
  assert.deepEqual(describeStageConditions({
    temperatureMinC: null,
    temperatureMaxC: null,
    maxGustKmh: null,
    maxPrecipitationMm: null,
    elevationMinM: null,
    elevationMaxM: null,
    validAt: null,
  }, null), ['Contexto meteorológico no disponible.'])
})
