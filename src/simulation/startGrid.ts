export interface PlannedStartSlot {
  simulationId: string
  startOffsetSeconds: number
}

export function buildPlannedStartGrid(carCount: number, startIntervalSeconds: number): PlannedStartSlot[] {
  if (!Number.isInteger(carCount) || carCount <= 0) {
    throw new Error('carCount must be a positive integer')
  }

  if (!Number.isFinite(startIntervalSeconds) || startIntervalSeconds <= 0) {
    throw new Error('startIntervalSeconds must be positive and finite')
  }

  return Array.from({ length: carCount }, (_, index) => ({
    simulationId: `SIM-${String(index + 1).padStart(2, '0')}`,
    startOffsetSeconds: index * startIntervalSeconds,
  }))
}
