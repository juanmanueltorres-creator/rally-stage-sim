import type { RouteEnvironmentSnapshot } from './openMeteo.ts'

export interface StrongestTemperatureShift {
  nodeId: string
  distanceKm: number
  deltaC: number
}

export interface RouteWeatherComparison {
  meanTemperatureDeltaC: number | null
  maxGustDeltaKmh: number | null
  maxPrecipitationDeltaMm: number | null
  strongestTemperatureShift: StrongestTemperatureShift | null
}

function finite(values: Array<number | null>): number[] {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

function mean(values: Array<number | null>): number | null {
  const available = finite(values)
  if (available.length === 0) return null
  return available.reduce((sum, value) => sum + value, 0) / available.length
}

function max(values: Array<number | null>): number | null {
  const available = finite(values)
  return available.length > 0 ? Math.max(...available) : null
}

function delta(after: number | null, before: number | null): number | null {
  return after === null || before === null ? null : after - before
}

export function compareRouteWeather(
  firstPass: RouteEnvironmentSnapshot[],
  secondPass: RouteEnvironmentSnapshot[],
): RouteWeatherComparison {
  const firstMeanTemperature = mean(firstPass.map((snapshot) => snapshot.temperatureC))
  const secondMeanTemperature = mean(secondPass.map((snapshot) => snapshot.temperatureC))
  const firstMaxGust = max(firstPass.map((snapshot) => snapshot.windGustKmh))
  const secondMaxGust = max(secondPass.map((snapshot) => snapshot.windGustKmh))
  const firstMaxPrecipitation = max(firstPass.map((snapshot) => snapshot.precipitationMm))
  const secondMaxPrecipitation = max(secondPass.map((snapshot) => snapshot.precipitationMm))

  const firstByNode = new Map(firstPass.map((snapshot) => [snapshot.node.id, snapshot]))
  let strongestTemperatureShift: StrongestTemperatureShift | null = null

  for (const after of secondPass) {
    const before = firstByNode.get(after.node.id)
    if (!before || before.temperatureC === null || after.temperatureC === null) continue

    const temperatureDelta = after.temperatureC - before.temperatureC
    if (
      strongestTemperatureShift === null ||
      Math.abs(temperatureDelta) > Math.abs(strongestTemperatureShift.deltaC)
    ) {
      strongestTemperatureShift = {
        nodeId: after.node.id,
        distanceKm: after.node.distanceKm,
        deltaC: temperatureDelta,
      }
    }
  }

  return {
    meanTemperatureDeltaC: delta(secondMeanTemperature, firstMeanTemperature),
    maxGustDeltaKmh: delta(secondMaxGust, firstMaxGust),
    maxPrecipitationDeltaMm: delta(secondMaxPrecipitation, firstMaxPrecipitation),
    strongestTemperatureShift,
  }
}
