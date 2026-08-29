import type { RouteEnvironmentSnapshot } from './openMeteo.ts'

export interface StageWeatherSummary {
  temperatureMinC: number | null
  temperatureMaxC: number | null
  maxGustKmh: number | null
  maxPrecipitationMm: number | null
  elevationMinM: number | null
  elevationMaxM: number | null
  validAt: string | null
}

function finiteValues(values: Array<number | null>): number[] {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

function minOrNull(values: Array<number | null>): number | null {
  const finite = finiteValues(values)
  return finite.length > 0 ? Math.min(...finite) : null
}

function maxOrNull(values: Array<number | null>): number | null {
  const finite = finiteValues(values)
  return finite.length > 0 ? Math.max(...finite) : null
}

export function summarizeRouteWeather(snapshots: RouteEnvironmentSnapshot[]): StageWeatherSummary {
  return {
    temperatureMinC: minOrNull(snapshots.map((snapshot) => snapshot.temperatureC)),
    temperatureMaxC: maxOrNull(snapshots.map((snapshot) => snapshot.temperatureC)),
    maxGustKmh: maxOrNull(snapshots.map((snapshot) => snapshot.windGustKmh)),
    maxPrecipitationMm: maxOrNull(snapshots.map((snapshot) => snapshot.precipitationMm)),
    elevationMinM: minOrNull(snapshots.map((snapshot) => snapshot.elevationM)),
    elevationMaxM: maxOrNull(snapshots.map((snapshot) => snapshot.elevationM)),
    validAt: snapshots[0]?.validAt ?? null,
  }
}
