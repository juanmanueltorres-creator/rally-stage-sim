interface StageCommandBarProps {
  distance: string
  technicalDistance?: string | null
  startTime: string
  geometry: string
  weather: string
  closure: string
  publicAccess: string
}

export function StageCommandBar({
  distance,
  technicalDistance,
  startTime,
  geometry,
  weather,
  closure,
  publicAccess,
}: StageCommandBarProps) {
  return (
    <section className="stage-command-bar" aria-label="Resumen operativo del tramo">
      <div><span>DISTANCE</span><strong>{distance}</strong>{technicalDistance ? <small>{technicalDistance}</small> : null}</div>
      <div><span>FIRST CAR</span><strong>{startTime}</strong></div>
      <div><span>GEOMETRY</span><strong>{geometry.toUpperCase()}</strong></div>
      <div><span>WEATHER</span><strong>{weather}</strong></div>
      <div><span>CLOSURE</span><strong>{closure}</strong></div>
      <div><span>PUBLIC ACCESS</span><strong>{publicAccess}</strong></div>
    </section>
  )
}
