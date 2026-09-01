import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import type { RallyScheduleStage, RallyStage, StageRouteReuse } from './rally.ts'
import { materializeTechnicalStages, withTechnicalAvailability } from './stageCatalog.ts'

interface ScheduleStage {
  sequence: number
  code: string
  name: string
  distanceKm: number
  scheduledStart: string
  interactive: boolean
}

test('Chile 2026 schedule snapshot exposes all 16 competitive stages without encoding app capability', async () => {
  const raw = await readFile(new URL('../../public/data/chile-2026/schedule.json', import.meta.url), 'utf8')
  const schedule = JSON.parse(raw) as ScheduleStage[]

  assert.equal(schedule.length, 16)
  assert.deepEqual(
    schedule.map((stage) => stage.code),
    Array.from({ length: 16 }, (_, index) => `SS${index + 1}`),
  )
  assert.equal(schedule[0].name, 'Turquía 1')
  assert.equal(schedule[0].scheduledStart, '2026-09-11T08:53:00-03:00')
  assert.equal(schedule[15].name, 'Powerstage BioBio 2')
  assert.equal(schedule[15].scheduledStart, '2026-09-13T13:15:00-03:00')

  // `interactive` is legacy presentation metadata. Runtime availability is derived
  // from loaded technical geometry so the schedule remains an independent source snapshot.
  assert.deepEqual(schedule.filter((stage) => stage.interactive).map((stage) => stage.code), ['SS1'])
})

test('Friday route reuse materializes SS1 through SS6 with independent second-pass times', async () => {
  const [scheduleRaw, baseRaw, fridayRaw, reuseRaw] = await Promise.all([
    readFile(new URL('../../public/data/chile-2026/schedule.json', import.meta.url), 'utf8'),
    readFile(new URL('../../public/data/chile-2026/stages.json', import.meta.url), 'utf8'),
    readFile(new URL('../../public/data/chile-2026/stages-friday.json', import.meta.url), 'utf8'),
    readFile(new URL('../../public/data/chile-2026/stage-route-reuse.json', import.meta.url), 'utf8'),
  ])

  const schedule = JSON.parse(scheduleRaw) as RallyScheduleStage[]
  const sourceStages = [
    ...(JSON.parse(baseRaw) as RallyStage[]),
    ...(JSON.parse(fridayRaw) as RallyStage[]),
  ]
  const reuse = JSON.parse(reuseRaw) as StageRouteReuse[]
  const technicalStages = materializeTechnicalStages(schedule, sourceStages, reuse)
  const runtimeSchedule = withTechnicalAvailability(schedule, technicalStages)

  assert.deepEqual(
    runtimeSchedule.filter((stage) => stage.interactive).map((stage) => stage.code),
    ['SS1', 'SS2', 'SS3', 'SS4', 'SS5', 'SS6'],
  )
  assert.deepEqual(technicalStages.map((stage) => stage.code), ['SS1', 'SS2', 'SS3', 'SS4', 'SS5', 'SS6'])

  const ss4 = technicalStages.find((stage) => stage.code === 'SS4')
  const ss5 = technicalStages.find((stage) => stage.code === 'SS5')
  const ss6 = technicalStages.find((stage) => stage.code === 'SS6')

  assert.equal(ss4?.scheduledStart, '2026-09-11T15:09:00-03:00')
  assert.equal(ss5?.scheduledStart, '2026-09-11T16:04:00-03:00')
  assert.equal(ss6?.scheduledStart, '2026-09-11T16:52:00-03:00')
  assert.equal(ss5?.distanceKm, 10.76)
  assert.equal(ss6?.distanceKm, 16.69)
  assert.equal(runtimeSchedule.find((stage) => stage.code === 'SS7')?.interactive, false)
})
