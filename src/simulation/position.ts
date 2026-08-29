import along from '@turf/along'
import { lineString } from '@turf/helpers'
import length from '@turf/length'
import type { StageLineString } from '../domain/rally.ts'

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(1, Math.max(0, progress))
}

export function positionAlongLine(line: StageLineString, progress: number): [number, number] {
  if (line.coordinates.length < 2) {
    throw new Error('stage geometry must contain at least two coordinates')
  }

  const route = lineString(line.coordinates)
  const routeLengthKm = length(route, { units: 'kilometers' })
  const point = along(route, routeLengthKm * clampProgress(progress), { units: 'kilometers' })
  const [longitude, latitude] = point.geometry.coordinates

  return [longitude, latitude]
}
