import type { RallyScheduleStage, RallyStage } from './rally.ts'

export function withTechnicalAvailability(
  schedule: RallyScheduleStage[],
  technicalStages: Pick<RallyStage, 'code' | 'geometry'>[],
): RallyScheduleStage[] {
  const availableCodes = new Set(
    technicalStages
      .filter((stage) => stage.geometry !== null)
      .map((stage) => stage.code),
  )

  return schedule.map((stage) => ({
    ...stage,
    interactive: availableCodes.has(stage.code),
  }))
}
