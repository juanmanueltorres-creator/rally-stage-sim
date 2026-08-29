import { useEffect, useMemo, useState } from 'react'
import type { RallyEvent, RallyStage } from './domain/rally'
import { RallyMap } from './components/RallyMap'

interface AppData {
  event: RallyEvent
  stage: RallyStage
}

function formatLocalStart(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(iso))
}

export function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const base = import.meta.env.BASE_URL
        const [eventResponse, stagesResponse] = await Promise.all([
          fetch(`${base}data/chile-2026/event.json`),
          fetch(`${base}data/chile-2026/stages.json`),
        ])

        if (!eventResponse.ok || !stagesResponse.ok) {
          throw new Error('Could not load the Chile 2026 snapshot')
        }

        const event = (await eventResponse.json()) as RallyEvent
        const stages = (await stagesResponse.json()) as RallyStage[]
        const stage = stages.find((candidate) => candidate.code === 'SS1')

        if (!stage) throw new Error('SS1 is missing from the Chile 2026 snapshot')
        if (!cancelled) setData({ event, stage })
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Unknown loading error')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const sourceCount = useMemo(() => data?.stage.provenance.sources.length ?? 0, [data])

  if (error) {
    return <main className="app-shell"><p className="load-error">{error}</p></main>
  }

  if (!data) {
    return <main className="app-shell"><p className="loading">Loading sourced rally snapshot…</p></main>
  }

  const { event, stage } = data

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">RALLY STAGE SIM · PRE-EVENT DATASET</p>
          <h1>{event.name}</h1>
          <p className="hero-copy">Space + time + performance context, without pretending estimates are telemetry.</p>
        </div>
        <div className="event-chip">
          <span>ROUND CONTEXT</span>
          <strong>{event.startDate} → {event.endDate}</strong>
        </div>
      </header>

      <section className="stage-grid" aria-label="Selected stage summary">
        <article className="stage-card stage-card--primary">
          <p className="eyebrow">{stage.code}</p>
          <h2>{stage.name}</h2>
          <div className="metrics">
            <div><span>DISTANCE</span><strong>{stage.distanceKm.toFixed(2)} km</strong></div>
            <div><span>FIRST CAR</span><strong>{formatLocalStart(stage.scheduledStart, event.timezone)}</strong></div>
            <div><span>DATA STATE</span><strong>{stage.provenance.state}</strong></div>
            <div><span>SOURCES</span><strong>{sourceCount}</strong></div>
          </div>
        </article>

        <article className="stage-card">
          <p className="eyebrow">INTEGRITY</p>
          <h2>No fake line</h2>
          <p>
            Distance and scheduled start are sourced. The route remains absent until a trustworthy stage LineString is verified.
          </p>
          <span className="integrity-badge">{stage.geometryStatus}</span>
        </article>
      </section>

      <RallyMap geometryStatus={stage.geometryStatus} />

      <section className="sources" aria-label="Data sources">
        <div>
          <p className="eyebrow">PROVENANCE</p>
          <h2>What this screen actually knows</h2>
        </div>
        <ul>
          {stage.provenance.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
              <span>accessed {source.accessedAt}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer>
        Unofficial open-source project. Not affiliated with FIA, WRC Promoter GmbH or event organizers.
      </footer>
    </main>
  )
}
