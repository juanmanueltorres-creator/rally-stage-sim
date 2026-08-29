import { useEffect, useMemo, useState } from 'react'
import type { RallyEvent, RallyStage, SimulatedStageRun } from './domain/rally'
import { RallyMap } from './components/RallyMap'

interface AppData {
  event: RallyEvent
  stage: RallyStage
  run: SimulatedStageRun
}

function formatLocalStart(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(iso))
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds - minutes * 60
  return `${minutes}:${remaining.toFixed(1).padStart(4, '0')}`
}

export function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const base = import.meta.env.BASE_URL
        const [eventResponse, stagesResponse, simulationResponse] = await Promise.all([
          fetch(`${base}data/chile-2026/event.json`),
          fetch(`${base}data/chile-2026/stages.json`),
          fetch(`${base}data/chile-2026/simulation.json`),
        ])

        if (!eventResponse.ok || !stagesResponse.ok || !simulationResponse.ok) {
          throw new Error('Could not load the Chile 2026 snapshot')
        }

        const event = (await eventResponse.json()) as RallyEvent
        const stages = (await stagesResponse.json()) as RallyStage[]
        const runs = (await simulationResponse.json()) as SimulatedStageRun[]
        const stage = stages.find((candidate) => candidate.code === 'SS1')

        if (!stage) throw new Error('SS1 is missing from the Chile 2026 snapshot')

        const run = runs.find((candidate) => candidate.stageId === stage.id)
        if (!run) throw new Error('SS1 simulation configuration is missing')

        if (!cancelled) setData({ event, stage, run })
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

  const sourceCount = useMemo(
    () => (data ? data.stage.provenance.sources.length + data.run.provenance.sources.length : 0),
    [data],
  )

  if (error) {
    return <main className="app-shell"><p className="load-error">{error}</p></main>
  }

  if (!data) {
    return <main className="app-shell"><p className="loading">Loading sourced rally snapshot…</p></main>
  }

  const { event, stage, run } = data
  const allSources = [...stage.provenance.sources, ...run.provenance.sources]

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
            <div><span>GEOMETRY</span><strong>{stage.geometryStatus}</strong></div>
            <div><span>SOURCES</span><strong>{sourceCount}</strong></div>
          </div>
        </article>

        <article className="stage-card">
          <p className="eyebrow">REFERENCE RECONSTRUCTION</p>
          <h2>No fake GPS</h2>
          <p>
            The line is map-matched from OpenStreetMap roads against the organizer&apos;s PE1 Turquía competition map.
            It is useful for simulation, but it is not an official GPS trace.
          </p>
          <span className="integrity-badge">{stage.geometryStatus}</span>
        </article>

        <article className="stage-card">
          <p className="eyebrow">MOTION BENCHMARK</p>
          <h2>{formatDuration(run.expectedDurationSeconds)} · {run.playbackSpeed}× playback</h2>
          <p>
            The motion benchmark comes from a local Rally2 run on the same PE1. It validates movement only and is not a WRC Rally1 forecast.
          </p>
          <span className="integrity-badge">{run.provenance.state}</span>
        </article>
      </section>

      <RallyMap geometryStatus={stage.geometryStatus} geometry={stage.geometry} run={run} />

      <section className="sources" aria-label="Data sources">
        <div>
          <p className="eyebrow">PROVENANCE</p>
          <h2>What this screen actually knows</h2>
        </div>
        <ul>
          {allSources.map((source) => (
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
