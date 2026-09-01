import type { StageLineString } from '../domain/rally.ts'
import { positionAlongLine } from './position.ts'
import { stageProgress } from './progress.ts'

export type VehicleStatus = 'waiting' | 'running' | 'finished'

export interface VehicleSnapshot {
  status: VehicleStatus
  progress: number
  coordinate: [number, number]
}

export function vehicleSnapshot(
  line: StageLineString,
  startTimeMs: number,
  expectedDurationMs: number,
  nowMs: number,
): VehicleSnapshot {
  const elapsedSeconds = (nowMs - startTimeMs) / 1_000
  const expectedDurationSeconds = expectedDurationMs / 1_000
  const progress = stageProgress(elapsedSeconds, expectedDurationSeconds)
  const status: VehicleStatus = nowMs < startTimeMs ? 'waiting' : progress >= 1 ? 'finished' : 'running'

  return {
    status,
    progress,
    coordinate: positionAlongLine(line, progress),
  }
}
