import type { StageSpectatorInfo } from '../domain/rally.ts'
import type { WeatherMode } from '../map/stageEnvironment.ts'

export type StageCommandWeatherStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

function formatClock(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso))
}

function hasSpatialSource(point: {
  coordinate?: [number, number]
  provenance?: { sources: unknown[] }
}): boolean {
  return Boolean(point.coordinate && point.provenance?.sources.length)
}

export function presentCommandWeather(
  status: StageCommandWeatherStatus,
  mode: WeatherMode | null,
): string {
  if (status === 'loading') return 'RESOLVING WEATHER'
  if (status === 'unavailable') return 'WEATHER UNAVAILABLE'
  if (mode === 'historical-reference') return 'HISTORICAL REF · 2021–2025'
  if (mode === 'forecast') return 'FORECAST'
  return 'WEATHER PENDING'
}

export function presentCommandClosure(
  spectator: StageSpectatorInfo | undefined,
  timezone: string,
): string {
  if (spectator?.roadClosureAt) return `${formatClock(spectator.roadClosureAt, timezone)} PREV`
  if (spectator?.roadClosureText) return spectator.roadClosureText.toUpperCase()
  return 'PENDING'
}

export function presentCommandPublicAccess(spectator: StageSpectatorInfo | undefined): string {
  const publicPoints = [
    ...(spectator?.spectatorZones ?? []),
    ...(spectator?.parking ?? []),
    ...(spectator?.accessPoints ?? []),
  ]
  return publicPoints.some(hasSpatialSource) ? 'OFFICIAL POINTS' : 'PENDING OFFICIAL POINTS'
}
