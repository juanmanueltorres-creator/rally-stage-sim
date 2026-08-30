import type { RouteNode } from './environmentNodes.ts'
import {
  normalizeOpenMeteoForecast,
  type OpenMeteoLocationPayload,
  type RouteEnvironmentSnapshot,
} from './openMeteo.ts'

const HISTORICAL_HOURLY_VARIABLES = [
  'temperature_2m',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'precipitation',
] as const

export const HISTORICAL_REFERENCE_YEARS = [2021, 2022, 2023, 2024, 2025] as const

interface FetchResponseLike {
  ok: boolean
  status?: number
  json(): Promise<unknown>
}

type FetchLike = (url: string) => Promise<FetchResponseLike>

function targetForYear(targetIso: string, year: number): string {
  return `${year}${targetIso.slice(4)}`
}

function historicalDate(targetIso: string, year: number): string {
  return `${year}${targetIso.slice(4, 10)}`
}

function finiteValues(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

function median(values: Array<number | null | undefined>): number | null {
  const finite = finiteValues(values)
  if (finite.length < 3) return null

  const sorted = [...finite].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

function aggregateValidAt(yearlySnapshots: RouteEnvironmentSnapshot[][], nodeIndex: number, targetIso?: string): string {
  const firstValid = yearlySnapshots
    .map((year) => year[nodeIndex]?.validAt)
    .find((value): value is string => typeof value === 'string' && value.includes('T'))

  if (!firstValid) return targetIso ?? ''
  if (!targetIso) return firstValid
  return `${targetIso.slice(0, 4)}${firstValid.slice(4)}`
}

export function buildHistoricalWeatherUrl(
  nodes: RouteNode[],
  targetIso: string,
  timezone: string,
  year: number,
): string {
  if (nodes.length === 0) throw new Error('at least one route node is required')
  if (!Number.isInteger(year) || year < 1940) throw new Error('historical year must be valid')

  const date = historicalDate(targetIso, year)
  const params = new URLSearchParams({
    latitude: nodes.map((node) => node.coordinate[1]).join(','),
    longitude: nodes.map((node) => node.coordinate[0]).join(','),
    hourly: HISTORICAL_HOURLY_VARIABLES.join(','),
    timezone,
    start_date: date,
    end_date: date,
    models: 'era5_seamless',
  })

  return `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`
}

export function normalizeHistoricalYear(
  nodes: RouteNode[],
  payload: OpenMeteoLocationPayload[],
  targetIso: string,
  year: number,
): RouteEnvironmentSnapshot[] {
  return normalizeOpenMeteoForecast(nodes, payload, targetForYear(targetIso, year))
}

export function aggregateHistoricalReference(
  yearlySnapshots: RouteEnvironmentSnapshot[][],
  targetIso?: string,
): RouteEnvironmentSnapshot[] {
  if (yearlySnapshots.length === 0) return []

  const nodeCount = Math.max(...yearlySnapshots.map((year) => year.length))
  const result: RouteEnvironmentSnapshot[] = []

  for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex += 1) {
    const rows = yearlySnapshots.map((year) => year[nodeIndex]).filter(Boolean)
    const node = rows[0]?.node
    if (!node) continue

    result.push({
      node,
      validAt: aggregateValidAt(yearlySnapshots, nodeIndex, targetIso),
      elevationM: median(rows.map((row) => row.elevationM)),
      temperatureC: median(rows.map((row) => row.temperatureC)),
      windSpeedKmh: median(rows.map((row) => row.windSpeedKmh)),
      windDirectionDeg: null,
      windGustKmh: median(rows.map((row) => row.windGustKmh)),
      precipitationMm: median(rows.map((row) => row.precipitationMm)),
    })
  }

  return result
}

export async function fetchHistoricalReference(
  nodes: RouteNode[],
  targetIso: string,
  timezone: string,
  fetcher: FetchLike = (url) => fetch(url),
): Promise<RouteEnvironmentSnapshot[]> {
  const yearlySnapshots: RouteEnvironmentSnapshot[][] = []

  for (const year of HISTORICAL_REFERENCE_YEARS) {
    const requestUrl = buildHistoricalWeatherUrl(nodes, targetIso, timezone, year)
    const response = await fetcher(requestUrl)

    if (!response.ok) {
      const statusSuffix = response.status ? ` (${response.status})` : ''
      throw new Error(`Open-Meteo historical request failed${statusSuffix}`)
    }

    const rawPayload = await response.json()
    const payload = (Array.isArray(rawPayload) ? rawPayload : [rawPayload]) as OpenMeteoLocationPayload[]
    yearlySnapshots.push(normalizeHistoricalYear(nodes, payload, targetIso, year))
  }

  return aggregateHistoricalReference(yearlySnapshots, targetIso)
}
