import type { StageLineString } from '../domain/rally.ts'
import type { PlannedStartSlot } from './startGrid.ts'
import { vehicleSnapshot, type VehicleSnapshot } from './vehicle.ts'

export interface FleetVehicleSnapshot extends VehicleSnapshot {
  simulationId: string
  startOffsetSeconds: number
}

export function fleetSnapshot(
  line: StageLineString,
  grid: PlannedStartSlot[],
  stageStartMs: number,
  expectedDurationMs: number,
  nowMs: number,
): FleetVehicleSnapshot[] {
  return grid.map((slot) => ({
    simulationId: slot.simulationId,
    startOffsetSeconds: slot.startOffsetSeconds,
    ...vehicleSnapshot(
      line,
      stageStartMs + slot.startOffsetSeconds * 1_000,
      expectedDurationMs,
      nowMs,
    ),
  }))
}
