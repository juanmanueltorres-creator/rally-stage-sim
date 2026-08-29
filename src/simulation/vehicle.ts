import type { StageLineString } from '../domain/rally.ts'

export type VehicleStatus = 'waiting' | 'running' | 'finished'

export interface VehicleSnapshot {
  status: VehicleStatus
  progress: number
  coordinate: [number, number]
}

export function vehicleSnapshot(
  line: StageLineString,
  _startTime: number,
  _expectedDuration: number,
  _now: number,
): VehicleSnapshot {
  return {
    status: 'waiting',
    progress: 0,
    coordinate: line.coordinates[0],
  }
}
