import type { FeatureCollection, LineString, Point } from 'geojson'
import type { SpectatorPoint, StageGeometryStatus, StageLineString } from '../domain/rally.ts'
import type { RouteNode } from './environmentNodes.ts'
import type { RouteDirectionArrow, RouteDistanceMarker } from './routeAnnotations.ts'

type StageMapKind =
  | 'stage-route'
  | 'simulated-vehicle'
  | 'stage-start'
  | 'environment-node'
  | 'stage-finish'
  | 'spectator-zone'
  | 'spectator-parking'
  | 'official-access'
  | 'no-spectator-zone'
  | 'distance-marker'
  | 'direction-arrow'
  | 'environment-chip'

type SimulatedVehicleStatus = 'waiting' | 'running' | 'finished'

export interface StageMapVehicle {
  simulationId: string
  status: SimulatedVehicleStatus
  progress: number
  coordinate: [number, number]
}

export interface StageMapSpectatorContext {
  spectatorZones: SpectatorPoint[]
  parking: SpectatorPoint[]
  accessPoints?: SpectatorPoint[]
  noSpectatorZones?: SpectatorPoint[]
}

export interface StageMapEnvironmentChip {
  nodeId: string
  coordinate: [number, number]
  label: string
  weatherMode: 'forecast' | 'historical-reference'
}

export interface StageMapAnnotations {
  distanceMarkers: RouteDistanceMarker[]
  directionArrows: RouteDirectionArrow[]
  environmentChips: StageMapEnvironmentChip[]
}

type StageMapProperties = {
  kind: StageMapKind
  geometryStatus?: StageGeometryStatus
  nodeId?: string
  distanceKm?: number
  simulationId?: string
  status?: SimulatedVehicleStatus
  progress?: number
  spectatorId?: string
  label?: string
  description?: string
  bearingDeg?: number
  weatherMode?: 'forecast' | 'historical-reference'
}

const EMPTY_ANNOTATIONS: StageMapAnnotations = {
  distanceMarkers: [],
  directionArrows: [],
  environmentChips: [],
}

const EMPTY_SPECTATOR_CONTEXT: StageMapSpectatorContext = {
  spectatorZones: [],
  parking: [],
  accessPoints: [],
  noSpectatorZones: [],
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

function hasSpatialProvenance(point: SpectatorPoint): point is SpectatorPoint & { coordinate: [number, number] } {
  return Boolean(point.coordinate && point.provenance && point.provenance.sources.length > 0)
}

function spectatorFeatures(
  points: SpectatorPoint[],
  kind: 'spectator-zone' | 'spectator-parking' | 'official-access' | 'no-spectator-zone',
) {
  return points
    .filter(hasSpatialProvenance)
    .map((point) => ({
      type: 'Feature' as const,
      properties: {
        kind,
        spectatorId: point.id,
        label: point.label,
        description: point.description,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: point.coordinate,
      },
    }))
}

export function buildStageGeoJson(
  line: StageLineString,
  vehicleInput: StageMapVehicle[] | [number, number],
  geometryStatus: StageGeometryStatus,
  nodes: RouteNode[] = [],
  spectator: StageMapSpectatorContext = EMPTY_SPECTATOR_CONTEXT,
  annotations: StageMapAnnotations = EMPTY_ANNOTATIONS,
): FeatureCollection<LineString | Point, StageMapProperties> {
  const vehicles = normalizeVehicles(vehicleInput)

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'stage-route', geometryStatus },
        geometry: { type: 'LineString', coordinates: line.coordinates },
      },
      ...vehicles.map((vehicle) => ({
        type: 'Feature' as const,
        properties: {
          kind: 'simulated-vehicle' as const,
          simulationId: vehicle.simulationId,
          status: vehicle.status,
          progress: vehicle.progress,
        },
        geometry: { type: 'Point' as const, coordinates: vehicle.coordinate },
      })),
      ...nodes.map((node) => ({
        type: 'Feature' as const,
        properties: {
          kind: nodeKind(node),
          nodeId: node.id,
          distanceKm: node.distanceKm,
        },
        geometry: { type: 'Point' as const, coordinates: node.coordinate },
      })),
      ...annotations.distanceMarkers.map((marker) => ({
        type: 'Feature' as const,
        properties: {
          kind: 'distance-marker' as const,
          distanceKm: marker.distanceKm,
          label: marker.label,
        },
        geometry: { type: 'Point' as const, coordinates: marker.coordinate },
      })),
      ...annotations.directionArrows.map((arrow) => ({
        type: 'Feature' as const,
        properties: {
          kind: 'direction-arrow' as const,
          bearingDeg: arrow.bearingDeg,
          label: '➤',
        },
        geometry: { type: 'Point' as const, coordinates: arrow.coordinate },
      })),
      ...annotations.environmentChips.map((chip) => ({
        type: 'Feature' as const,
        properties: {
          kind: 'environment-chip' as const,
          nodeId: chip.nodeId,
          label: chip.label,
          weatherMode: chip.weatherMode,
        },
        geometry: { type: 'Point' as const, coordinates: chip.coordinate },
      })),
      ...spectatorFeatures(spectator.spectatorZones, 'spectator-zone'),
      ...spectatorFeatures(spectator.parking, 'spectator-parking'),
      ...spectatorFeatures(spectator.accessPoints ?? [], 'official-access'),
      ...spectatorFeatures(spectator.noSpectatorZones ?? [], 'no-spectator-zone'),
    ],
  }
}