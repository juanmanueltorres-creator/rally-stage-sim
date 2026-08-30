import along from '@turf/along'
import { lineString } from '@turf/helpers'
import length from '@turf/length'
import type { StageLineString } from '../domain/rally.ts'
import type { RouteNode } from './environmentNodes.ts'

export interface RouteDistanceMarker {
  distanceKm: number
  label: string
  coordinate: [number, number]
}

export interface RouteDirectionArrow {
  coordinate: [number, number]
  bearingDeg: number
}

function coordinateAtDistance(line: StageLineString, distanceKm: number): [number, number] {
  const route = lineString(line.coordinates)
  const point = along(route, distanceKm, { units: 'kilometers' })
  const [longitude, latitude] = point.geometry.coordinates
  return [longitude, latitude]
}

function routeLengthKm(line: StageLineString): number {
  if (line.coordinates.length < 2) return 0
  return length(lineString(line.coordinates), { units: 'kilometers' })
}

function bearingBetween(from: [number, number], to: [number, number]): number {
  const [lon1, lat1] = from.map((value) => value * Math.PI / 180)
  const [lon2, lat2] = to.map((value) => value * Math.PI / 180)
  const deltaLon = lon2 - lon1
  const y = Math.sin(deltaLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)
  const degrees = Math.atan2(y, x) * 180 / Math.PI
  return (degrees + 360) % 360
}

export function buildDistanceMarkers(line: StageLineString, spacingKm = 5): RouteDistanceMarker[] {
  if (!Number.isFinite(spacingKm) || spacingKm <= 0) {
    throw new Error('spacingKm must be positive and finite')
  }

  const totalKm = routeLengthKm(line)
  if (totalKm <= 0) return []

  const markers: RouteDistanceMarker[] = []
  for (let distanceKm = spacingKm; distanceKm < totalKm; distanceKm += spacingKm) {
    const rounded = Number(distanceKm.toFixed(3))
    markers.push({
      distanceKm: rounded,
      label: `KM ${Number(distanceKm.toFixed(1))}`,
      coordinate: coordinateAtDistance(line, distanceKm),
    })
  }
  return markers
}

export function buildDirectionArrows(line: StageLineString, targetCount = 4): RouteDirectionArrow[] {
  if (!Number.isInteger(targetCount) || targetCount <= 0) {
    throw new Error('targetCount must be a positive integer')
  }

  const totalKm = routeLengthKm(line)
  if (totalKm <= 0) return []

  const sampleStepKm = Math.max(0.02, Math.min(0.12, totalKm / 100))

  return Array.from({ length: targetCount }, (_, index) => {
    const fraction = (index + 1) / (targetCount + 1)
    const anchorKm = totalKm * fraction
    const beforeKm = Math.max(0, anchorKm - sampleStepKm)
    const afterKm = Math.min(totalKm, anchorKm + sampleStepKm)
    const before = coordinateAtDistance(line, beforeKm)
    const after = coordinateAtDistance(line, afterKm)

    return {
      coordinate: coordinateAtDistance(line, anchorKm),
      bearingDeg: Number(bearingBetween(before, after).toFixed(2)),
    }
  })
}

function nearestNode(nodes: RouteNode[], targetKm: number, preferHigherOnTie: boolean): RouteNode {
  return nodes.reduce((best, candidate) => {
    const bestDistance = Math.abs(best.distanceKm - targetKm)
    const candidateDistance = Math.abs(candidate.distanceKm - targetKm)
    if (candidateDistance < bestDistance) return candidate
    if (candidateDistance > bestDistance) return best
    if (preferHigherOnTie && candidate.distanceKm > best.distanceKm) return candidate
    if (!preferHigherOnTie && candidate.distanceKm < best.distanceKm) return candidate
    return best
  })
}

export function selectRepresentativeNodes(nodes: RouteNode[], maxCount = 5): RouteNode[] {
  if (nodes.length <= maxCount) return [...nodes]
  if (maxCount <= 0) return []
  if (maxCount === 1) return [nodes[0]]
  if (maxCount === 2) return [nodes[0], nodes.at(-1)!]

  const finishDistance = nodes.at(-1)!.distanceKm
  const fractions = maxCount === 3
    ? [0, 0.5, 1]
    : Array.from({ length: maxCount }, (_, index) => index / (maxCount - 1))

  const selected = fractions.map((fraction) => {
    if (fraction === 0) return nodes[0]
    if (fraction === 1) return nodes.at(-1)!
    return nearestNode(nodes, finishDistance * fraction, fraction > 0.5)
  })

  return Array.from(new Map(selected.map((node) => [node.id, node])).values())
}
