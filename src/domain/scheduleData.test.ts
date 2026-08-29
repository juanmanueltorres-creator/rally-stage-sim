import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

interface ScheduleStage {
  sequence: number
  code: string
  name: string
  distanceKm: number
  scheduledStart: string
  interactive: boolean
}

test('Chile 2026 schedule snapshot exposes all 16 competitive stages and opens the Friday morning loop', async () => {
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
  assert.deepEqual(schedule.filter((stage) => stage.interactive).map((stage) => stage.code), ['SS1', 'SS2', 'SS3'])
})
