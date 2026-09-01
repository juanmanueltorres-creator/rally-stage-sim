import type { TemperatureDeltaProfilePoint } from '../map/weatherComparison'

interface TemperatureDeltaProfileProps {
  points: TemperatureDeltaProfilePoint[]
}

function pointLabel(point: TemperatureDeltaProfilePoint): string {
  if (point.role === 'start') return 'START'
  if (point.role === 'finish') return 'FINISH'
  return `KM ${point.distanceKm.toFixed(1)}`
}

function signedTemperature(value: number | null): string {
  if (value === null) return '—'
  const rounded = value.toFixed(1)
  return `${value > 0 ? '+' : ''}${rounded} °C`
}

export function TemperatureDeltaProfile({ points }: TemperatureDeltaProfileProps) {
  const available = points.filter((point) => point.deltaC !== null)
  const maxAbs = Math.max(1, ...available.map((point) => Math.abs(point.deltaC!)))
  const totalDistance = Math.max(0, ...points.map((point) => point.distanceKm))

  if (points.length === 0 || available.length === 0 || totalDistance <= 0) {
    return <p className="temperature-profile-empty">Perfil térmico no disponible para comparar.</p>
  }

  return (
    <div className="temperature-profile" role="img" aria-label="Perfil de diferencia de temperatura, Pass 2 menos Pass 1, a lo largo del tramo">
      <div className="temperature-profile-scale" aria-hidden="true">
        <span>+{maxAbs.toFixed(1)}°</span>
        <span>0°</span>
        <span>−{maxAbs.toFixed(1)}°</span>
      </div>
      <div className="temperature-profile-plot">
        <div className="temperature-profile-zero" aria-hidden="true" />
        {points.map((point, index) => {
          const x = (point.distanceKm / totalDistance) * 100
          const magnitude = point.deltaC === null ? 0 : Math.min(1, Math.abs(point.deltaC) / maxAbs)
          const stemHeight = magnitude * 42
          const positive = (point.deltaC ?? 0) >= 0
          const label = pointLabel(point)
          const value = signedTemperature(point.deltaC)

          return (
            <div
              className={`temperature-profile-node${point.deltaC === null ? ' temperature-profile-node--missing' : ''}`}
              key={`${point.nodeId}-${index}`}
              style={{ left: `${x}%` }}
              title={`${label}: ${value}`}
            >
              {point.deltaC !== null ? (
                <span
                  className={`temperature-profile-stem ${positive ? 'temperature-profile-stem--positive' : 'temperature-profile-stem--negative'}`}
                  style={positive ? { height: `${stemHeight}%`, bottom: '50%' } : { height: `${stemHeight}%`, top: '50%' }}
                />
              ) : null}
              <span className="temperature-profile-dot" aria-hidden="true" />
              <span className="temperature-profile-value">{value}</span>
              <span className="temperature-profile-label">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
