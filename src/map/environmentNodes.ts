import along from '@turf/along'
import { lineString } from '@turf/helpers'
import length from '@turf/length'
import type { StageLineString } from '../domain/rally.ts'

export type RouteNodeRole = 'start' | 'context' | 'finish'

export interface RouteNode {
  id: string
  role: RouteNodeRole
  distanceKm: number
  coordinate: [number, number]
}

function coordinateAtDistance(line: StageLineString, distanceKm: number): [number, number] {
  const route = lineString(line.coordinates)
  const point = along(route, distanceKm, { units: 'kilometers' })
  const [longitude, latitude] = point.geometry.coordinates
  return [longitude, latitude]
}

export function buildRouteNodes(line: StageLineString, spacingKm = 2.5): RouteNode[] {
  if (line.coordinates.length < 2) {
    throw new Error('stage geometry must contain at least two coordinates')
  }
  if (!Number.isFinite(spacingKm) || spacingKm <= 0) {
    throw new Error('spacingKm must be positive and finite')
  }

  const route = lineString(line.coordinates)
  const routeLengthKm = length(route, { units: 'kilometers' })
  if (routeLengthKm <= 0) {
    throw new Error('stage geometry must have positive length')
  }

  const nodes: RouteNode[] = [
    {
      id: 'start',
      role: 'start',
      distanceKm: 0,
      coordinate: [...line.coordinates[0]],
    },
  ]

  for (let distanceKm = spacingKm; distanceKm < routeLengthKm; distanceKm += spacingKm) {
    nodes.push({
      id: `km-${distanceKm.toFixed(1)}`,
      role: 'context',
      distanceKm: Number(distanceKm.toFixed(3)),
      coordinate: coordinateAtDistance(line, distanceKm),
    })
  }

  nodes.push({
    id: 'finish',
    role: 'finish',
    distanceKm: Number(routeLengthKm.toFixed(3)),
    coordinate: [...line.coordinates.at(-1)!],
  })

  return nodes
}
