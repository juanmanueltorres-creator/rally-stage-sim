import type { StageLineString } from '../domain/rally.ts'

export function positionAlongLine(line: StageLineString, _progress: number): [number, number] {
  return line.coordinates[0]
}
