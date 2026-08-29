import type { FeatureCollection, LineString, Point } from 'geojson'
import type { StageGeometryStatus, StageLineString } from '../domain/rally.ts'
import type { RouteNode } from './environmentNodes.ts'

type StageMapKind =
  | 'stage-route'
  | 'simulated-vehicle'
  | 'stage-start'
  | 'environment-node'
  | 'stage-finish'

type SimulatedVehicleStatus = 'waiting' | 'running' | 'finished'

export interface StageMapVehicle {
  simulationId: string
  status: SimulatedVehicleStatus
  progress: number
  coordinate: [number, number]
}

type StageMapProperties = {
  kind: StageMapKind
  geometryStatus?: StageGeometryStatus
  nodeId?: string
  distanceKm?: number
  simulationId?: string
  status?: SimulatedVehicleStatus
  progress?: number
}

function nodeKind(node: RouteNode): StageMapKind {
  if (node.role === 'start') return 'stage-start'
  if (node.role === 'finish') return 'stage-finish'
  return 'environment-node'
}

function normalizeVehicles(vehicles: StageMapVehicle[] | [number, number]): StageMapVehicle[] {
  if (typeof vehicles[0] === 'number') {
    return [{
      simulationId: 'SIM-01',
      status: 'running',
      progress: 0,
      coordinate: vehicles as [number, number],
    }]
  }

  return vehicles as StageMapVehicle[]
}

export function buildStageGeoJson(
  line: StageLineString,
  vehicleInput: StageMapVehicle[] | [number, number],
  geometryStatus: StageGeometryStatus,
  nodes: RouteNode[] = [],
): FeatureCollection<LineString | Point, StageMapProperties> {
  const vehicles = normalizeVehicles(vehicleInput)

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
      ...vehicles.map((vehicle) => ({
        type: 'Feature' as const,
        properties: {
          kind: 'simulated-vehicle' as const,
          simulationId: vehicle.simulationId,
          status: vehicle.status,
          progress: vehicle.progress,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: vehicle.coordinate,
        },
      })),
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
