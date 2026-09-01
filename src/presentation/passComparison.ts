import type { RouteWeatherComparison } from '../map/weatherComparison.ts'

export interface PassComparisonView {
  temperature: string
  gusts: string
  precipitation: string
  strongestShift: string
}

function signed(value: number | null, unit: string, decimals: number): string {
  if (value === null) return '—'
  const magnitude = Math.abs(value).toFixed(decimals)
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${magnitude} ${unit}`
}

function routePosition(nodeId: string, distanceKm: number): string {
  if (nodeId === 'start') return 'START'
  if (nodeId === 'finish') return 'FINISH'
  return `KM ${distanceKm.toFixed(1)}`
}

export function presentPassComparison(comparison: RouteWeatherComparison): PassComparisonView {
  return {
    temperature: signed(comparison.meanTemperatureDeltaC, '°C', 1),
    gusts: signed(comparison.maxGustDeltaKmh, 'km/h', 0),
    precipitation: signed(comparison.maxPrecipitationDeltaMm, 'mm', 1),
    strongestShift: comparison.strongestTemperatureShift
      ? `${routePosition(
          comparison.strongestTemperatureShift.nodeId,
          comparison.strongestTemperatureShift.distanceKm,
        )} · ${signed(comparison.strongestTemperatureShift.deltaC, '°C', 1)}`
      : '—',
  }
}
