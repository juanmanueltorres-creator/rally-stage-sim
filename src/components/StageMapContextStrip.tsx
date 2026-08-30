import type { StageGeometryStatus } from '../domain/rally'
import type { WeatherMode } from '../map/stageEnvironment'
import type { EnvironmentStatus } from './RallyMap'

interface StageMapContextStripProps {
  distancePrimary: string
  distanceTechnical?: string | null
  startTime: string
  geometryStatus: StageGeometryStatus
  weatherStatus: EnvironmentStatus
  weatherMode: WeatherMode | null
  closure: string
  publicAccess: string
}

function weatherLabel(status: EnvironmentStatus, mode: WeatherMode | null): string {
  if (status === 'loading') return 'RESOLVING WEATHER'
  if (status === 'unavailable') return 'WEATHER UNAVAILABLE'
  if (mode === 'historical-reference') return 'HISTORICAL REF · 2021–2025'
  if (mode === 'forecast') return 'FORECAST'
  return 'WEATHER PENDING'
}

export function StageMapContextStrip({
  distancePrimary,
  distanceTechnical,
  startTime,
  geometryStatus,
  weatherStatus,
  weatherMode,
  closure,
  publicAccess,
}: StageMapContextStripProps) {
  return (
    <div className="stage-map-context-strip" aria-label="Contexto visible del tramo">
      <div><span>DISTANCE</span><strong>{distancePrimary}</strong>{distanceTechnical ? <small>{distanceTechnical}</small> : null}</div>
      <div><span>FIRST CAR</span><strong>{startTime}</strong></div>
      <div><span>GEOMETRY</span><strong>{geometryStatus.toUpperCase()}</strong></div>
      <div><span>WEATHER</span><strong>{weatherLabel(weatherStatus, weatherMode)}</strong></div>
      <div><span>CLOSURE</span><strong>{closure}</strong></div>
      <div><span>PUBLIC ACCESS</span><strong>{publicAccess}</strong></div>
    </div>
  )
}
