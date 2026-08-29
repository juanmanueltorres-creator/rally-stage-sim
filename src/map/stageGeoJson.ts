import type { FeatureCollection, LineString, Point } from 'geojson'
import type { StageGeometryStatus, StageLineString } from '../domain/rally.ts'
import type { RouteNode } from './environmentNodes.ts'

type StageMapKind =
  | 'stage-route'
  | 'simulated-vehicle'
  | 'stage-start'
  | 'environment-node'
  | 'stage-finish'

type StageMapProperties = {
  kind: StageMapKind
  geometryStatus?: StageGeometryStatus
  nodeId?: string
  distanceKm?: number
}

function nodeKind(node: RouteNode): StageMapKind {
  if (node.role === 'start') return 'stage-start'
  if (node.role === 'finish') return 'stage-finish'
  return 'environment-node'
}

export function buildStageGeoJson(
  line: StageLineString,
  vehicleCoordinate: [number, number],
  geometryStatus: StageGeometryStatus,
  nodes: RouteNode[] = [],
): FeatureCollection<LineString | Point, StageMapProperties> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          kind: 'stage-route',
          geometryStatus,
        },
        geometry: {
          type: 'LineString',
          coordinates: line.coordinates,
        },
      },
      {
        type: 'Feature',
        properties: {
          kind: 'simulated-vehicle',
        },
        geometry: {
          type: 'Point',
          coordinates: vehicleCoordinate,
        },
      },
      ...nodes.map((node) => ({
        type: 'Feature' as const,
        properties: {
          kind: nodeKind(node),
          nodeId: node.id,
          distanceKm: node.distanceKm,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: node.coordinate,
        },
      })),
    ],
  }
}
