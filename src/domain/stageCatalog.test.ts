import assert from 'node:assert/strict'
import test from 'node:test'
import type { RallyScheduleStage, RallyStage } from './rally.ts'
import { withTechnicalAvailability } from './stageCatalog.ts'

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
