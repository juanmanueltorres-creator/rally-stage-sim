import type { FeatureCollection, LineString, Point } from 'geojson'
import type { StageGeometryStatus, StageLineString } from '../domain/rally.ts'

type StageMapProperties = {
  kind: 'stage-route' | 'simulated-vehicle'
  geometryStatus?: StageGeometryStatus
}

export function buildStageGeoJson(
  line: StageLineString,
  vehicleCoordinate: [number, number],
  geometryStatus: StageGeometryStatus,
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
    ],
  }
}
