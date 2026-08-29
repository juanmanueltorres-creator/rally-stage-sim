import type { RouteEnvironmentSnapshot } from './openMeteo.ts'

export interface EnvironmentSnapshotView {
  position: string
  temperature: string
  wind: string
  gust: string
  elevation: string
  precipitation: string
  validAt: string
}

function numeric(value: number | null, suffix: string, digits = 0): string {
  if (value === null) return '—'
  return `${value.toFixed(digits)}${suffix}`
}

function positionLabel(snapshot: RouteEnvironmentSnapshot): string {
  if (snapshot.node.role === 'start') return 'START'
  if (snapshot.node.role === 'finish') return 'FINISH'
  return `KM ${snapshot.node.distanceKm.toFixed(1)}`
}

function windLabel(snapshot: RouteEnvironmentSnapshot): string {
  if (snapshot.windSpeedKmh === null) return '—'
  const speed = `${snapshot.windSpeedKmh.toFixed(0)} km/h`
  if (snapshot.windDirectionDeg === null) return speed
  return `${speed} · ${snapshot.windDirectionDeg.toFixed(0)}°`
}

export function presentEnvironmentSnapshot(snapshot: RouteEnvironmentSnapshot): EnvironmentSnapshotView {
  return {
    position: positionLabel(snapshot),
    temperature: numeric(snapshot.temperatureC, ' °C', 1),
    wind: windLabel(snapshot),
    gust: snapshot.windGustKmh === null ? '—' : `G ${snapshot.windGustKmh.toFixed(0)} km/h`,
    elevation: numeric(snapshot.elevationM, ' m'),
    precipitation: numeric(snapshot.precipitationMm, ' mm', 1),
    validAt: snapshot.validAt.slice(11, 16),
  }
}
