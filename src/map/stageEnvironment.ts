import type { RouteNode } from './environmentNodes.ts'
import { fetchHistoricalReference } from './historicalWeather.ts'
import { fetchOpenMeteoForecast, type RouteEnvironmentSnapshot } from './openMeteo.ts'

export type WeatherMode = 'forecast' | 'historical-reference'

export interface RouteEnvironmentDataset {
  mode: WeatherMode
  snapshots: RouteEnvironmentSnapshot[]
  sourceLabel: string
  methodologyNote?: string
}

type EnvironmentFetcher = (
  nodes: RouteNode[],
  targetIso: string,
  timezone: string,
) => Promise<RouteEnvironmentSnapshot[]>

interface StageEnvironmentDependencies {
  forecast?: EnvironmentFetcher
  historical?: EnvironmentFetcher
}

const HISTORICAL_METHODOLOGY_NOTE =
  'Reference derived from 2021–2025 values for the same calendar day and local stage hour. Median per node/variable; minimum three valid years. It is not a forecast, climate normal or rally-day observation.'

export async function fetchStageEnvironment(
  nodes: RouteNode[],
  targetIso: string,
  timezone: string,
  deps: StageEnvironmentDependencies = {},
): Promise<RouteEnvironmentDataset> {
  const forecast = deps.forecast ?? fetchOpenMeteoForecast
  const historical = deps.historical ?? fetchHistoricalReference

  try {
    const snapshots = await forecast(nodes, targetIso, timezone)
    return {
      mode: 'forecast',
      snapshots,
      sourceLabel: 'FORECAST · OPEN-METEO',
    }
  } catch {
    try {
      const snapshots = await historical(nodes, targetIso, timezone)
      return {
        mode: 'historical-reference',
        snapshots,
        sourceLabel: 'HISTORICAL REFERENCE · 2021–2025',
        methodologyNote: HISTORICAL_METHODOLOGY_NOTE,
      }
    } catch (historicalError) {
      const suffix = historicalError instanceof Error && historicalError.message
        ? `: ${historicalError.message}`
        : ''
      throw new Error(`weather unavailable after forecast and historical reference attempts${suffix}`)
    }
  }
}

export function weatherModesComparable(first: WeatherMode, second: WeatherMode): boolean {
  return first === second
}
