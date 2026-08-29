import type { RallyEvent, RallyScheduleStage } from '../domain/rally'
import { stageHash } from '../navigation/stageRoute'
import { groupScheduleByDay, totalCompetitiveKm } from '../presentation/stageExperience'

interface RallyOverviewProps {
  event: RallyEvent
  schedule: RallyScheduleStage[]
  notice?: string
  onOpenIntro: () => void
}

function formatClock(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso))
}

export function RallyOverview({ event, schedule, notice, onOpenIntro }: RallyOverviewProps) {
  const groups = groupScheduleByDay(schedule)
  const totalKm = totalCompetitiveKm(schedule)

  return (
    <main className="app-shell overview-shell">
      <nav className="topbar" aria-label="Navegación principal">
        <span>RALLY STAGE INTELLIGENCE</span>
        <strong>CHILE · 2026</strong>
        <button type="button" className="text-button" onClick={onOpenIntro}>WHY THIS EXISTS</button>
      </nav>

      <header className="overview-hero">
        <div>
          <p className="eyebrow">TRAMOS · CLIMA · CONTEXTO</p>
          <h1 className="editorial-title">{event.name}</h1>
          <p className="hero-copy">
            Una vista simple del recorrido competitivo: qué tramo viene, a qué hora, qué sabemos de sus condiciones y qué información oficial todavía falta.
          </p>
        </div>
        <div className="overview-stats" aria-label="Resumen del rally">
          <div><span>TRAMOS</span><strong>{schedule.length}</strong></div>
          <div><span>COMPETITIVOS</span><strong>{totalKm.toFixed(2)} km</strong></div>
          <div><span>FECHAS</span><strong>10 → 13 SEP</strong></div>
        </div>
      </header>

      {notice ? <p className="route-notice">{notice}. Volvimos al listado general.</p> : null}

      <section className="overview-intro-strip">
        <span className="status-pulse" aria-hidden="true" />
        <p><strong>SS1 TURQUÍA</strong> ya tiene recorrido reconstruido + contexto climático por nodos. El resto se publica sin inventar geometrías mientras espera verificación.</p>
      </section>

      <div className="schedule-days">
        {groups.map((group) => (
          <section className="schedule-day" key={group.date} aria-labelledby={`day-${group.date}`}>
            <header className="day-header">
              <p className="eyebrow">{group.label}</p>
              <span>{group.stages.reduce((sum, stage) => sum + stage.distanceKm, 0).toFixed(2)} km</span>
            </header>
            <div className="stage-list">
              {group.stages.map((stage) => (
                <article className={`overview-stage-card${stage.interactive ? ' overview-stage-card--ready' : ''}`} key={stage.code}>
                  <div className="stage-code-block">
                    <span>{stage.code}</span>
                    <strong>{formatClock(stage.scheduledStart, event.timezone)}</strong>
                  </div>
                  <div className="stage-name-block">
                    <h2>{stage.name}</h2>
                    <p>{stage.distanceKm.toFixed(2)} km</p>
                  </div>
                  <div className="stage-action-block">
                    {stage.interactive ? (
                      <a className="stage-link" href={stageHash(event.id, stage.slug)}>VER TRAMO <span aria-hidden="true">→</span></a>
                    ) : (
                      <span className="pending-chip">CONTEXTO PENDIENTE</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="integrity-strip">
        <div>
          <p className="eyebrow">REGLA DE LA CASA</p>
          <h2 className="editorial-subtitle">Si no está verificado, no lo hacemos pasar por cierto.</h2>
        </div>
        <p>Pronóstico ≠ observación. Geometría reconstruida ≠ GPS oficial. Lista de inscriptos ≠ orden de largada. Información faltante ≠ cero.</p>
      </section>

      <footer>
        Proyecto open-source no oficial. No afiliado a FIA, WRC Promoter GmbH ni a la organización del evento.
      </footer>
    </main>
  )
}
