import type { RouteNode } from './environmentNodes.ts'

interface OpenMeteoHourlyPayload {
  time?: string[]
  temperature_2m?: Array<number | null>
  wind_speed_10m?: Array<number | null>
  wind_direction_10m?: Array<number | null>
  wind_gusts_10m?: Array<number | null>
  precipitation?: Array<number | null>
}

export interface OpenMeteoLocationPayload {
  elevation?: number | null
  hourly?: OpenMeteoHourlyPayload
}

export interface RouteEnvironmentSnapshot {
  node: RouteNode
  validAt: string
  elevationM: number | null
  temperatureC: number | null
  windSpeedKmh: number | null
  windDirectionDeg: number | null
  windGustKmh: number | null
  precipitationMm: number | null
}

function wallClockMinutes(value: string): number {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return Number.NaN
  const [, year, month, day, hour, minute] = match
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) / 60_000
}

function nearestTimeIndex(times: string[], targetIso: string): number {
  const target = wallClockMinutes(targetIso)
  if (!Number.isFinite(target) || times.length === 0) return -1

  let nearestIndex = -1
  let nearestDistance = Number.POSITIVE_INFINITY

  times.forEach((time, index) => {
    const candidate = wallClockMinutes(time)
    if (!Number.isFinite(candidate)) return
    const distance = Math.abs(candidate - target)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })

  return nearestIndex
}

function valueAt(values: Array<number | null> | undefined, index: number): number | null {
  if (!values || index < 0) return null
  const value = values[index]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function normalizeOpenMeteoForecast(
  nodes: RouteNode[],
  payload: OpenMeteoLocationPayload[],
  targetIso: string,
): RouteEnvironmentSnapshot[] {
  return nodes.map((node, nodeIndex) => {
    const location = payload[nodeIndex]
    const hourly = location?.hourly
    const times = hourly?.time ?? []
    const timeIndex = nearestTimeIndex(times, targetIso)

    return {
      node,
      validAt: timeIndex >= 0 ? times[timeIndex] : targetIso,
      elevationM: typeof location?.elevation === 'number' && Number.isFinite(location.elevation)
        ? location.elevation
        : null,
      temperatureC: valueAt(hourly?.temperature_2m, timeIndex),
      windSpeedKmh: valueAt(hourly?.wind_speed_10m, timeIndex),
      windDirectionDeg: valueAt(hourly?.wind_direction_10m, timeIndex),
      windGustKmh: valueAt(hourly?.wind_gusts_10m, timeIndex),
      precipitationMm: valueAt(hourly?.precipitation, timeIndex),
    }
  })
}
