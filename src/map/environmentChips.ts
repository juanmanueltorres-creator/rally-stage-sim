import type { RouteEnvironmentSnapshot } from './openMeteo.ts'
import { selectRepresentativeNodes } from './routeAnnotations.ts'
import type { StageMapEnvironmentChip } from './stageGeoJson.ts'
import type { WeatherMode } from './stageEnvironment.ts'

function positionLabel(snapshot: RouteEnvironmentSnapshot): string {
  if (snapshot.node.role === 'start') return 'START'
  if (snapshot.node.role === 'finish') return 'FINISH'
  return `KM ${Number(snapshot.node.distanceKm.toFixed(1))}`
}

function valueLabel(snapshot: RouteEnvironmentSnapshot): string | null {
  if (snapshot.temperatureC !== null) return `${snapshot.temperatureC.toFixed(1)} °C`
  if (snapshot.windGustKmh !== null) return `GUST ${snapshot.windGustKmh.toFixed(0)}`
  if (snapshot.precipitationMm !== null) return `${snapshot.precipitationMm.toFixed(1)} mm`
  if (snapshot.elevationM !== null) return `${snapshot.elevationM.toFixed(0)} m`
  return null
}

export function buildEnvironmentChips(
  snapshots: RouteEnvironmentSnapshot[],
  weatherMode: WeatherMode,
  maxCount = 5,
): StageMapEnvironmentChip[] {
  if (snapshots.length === 0 || maxCount <= 0) return []

  const byNodeId = new Map(snapshots.map((snapshot) => [snapshot.node.id, snapshot]))
  const representativeNodes = selectRepresentativeNodes(snapshots.map((snapshot) => snapshot.node), maxCount)

  return representativeNodes.flatMap((node) => {
    const snapshot = byNodeId.get(node.id)
    if (!snapshot) return []

    const value = valueLabel(snapshot)
    if (!value) return []

    return [{
      nodeId: node.id,
      coordinate: node.coordinate,
      label: `${positionLabel(snapshot)} · ${value}`,
      weatherMode,
    }]
  })
}
