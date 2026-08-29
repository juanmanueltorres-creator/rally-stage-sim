import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  RallyEntry,
  RallyEvent,
  RallyScheduleStage,
  RallyStage,
  SimulatedStageRun,
  StageSpectatorInfo,
} from '../domain/rally'
import { buildRouteNodes } from '../map/environmentNodes'
import { fetchOpenMeteoForecast, type RouteEnvironmentSnapshot } from '../map/openMeteo'
import { compareRouteWeather } from '../map/weatherComparison'
import { summarizeRouteWeather, type StageWeatherSummary } from '../map/weatherSummary'
import { stageShareUrl } from '../navigation/stageRoute'
import { presentPassComparison } from '../presentation/passComparison'
import { presentStageDistance } from '../presentation/stageDistance'
import { describeStageConditions } from '../presentation/stageExperience'
import { buildPlannedStartGrid } from '../simulation/startGrid'
import { RallyMap, type EnvironmentStatus } from './RallyMap'

interface StagePassPair {
  firstPass: RallyScheduleStage
  secondPass: RallyScheduleStage
}

interface StageDetailProps {
  event: RallyEvent
  stage: RallyScheduleStage
  technicalStage: RallyStage | null
  passPair: StagePassPair | null
  run: SimulatedStageRun | null
  entries: RallyEntry[]
  spectator: StageSpectatorInfo
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

function formatDateTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso))
}

function formatRange(min: number | null, max: number | null, unit: string, decimals = 1): string {
  if (min === null || max === null) return '—'
  return `${min.toFixed(decimals)}–${max.toFixed(decimals)} ${unit}`
}

function formatValue(value: number | null, unit: string, decimals = 1): string {
  return value === null ? '—' : `${value.toFixed(decimals)} ${unit}`
}

function emptyWeatherSummary(): StageWeatherSummary {
  return {
    temperatureMinC: null,
    temperatureMaxC: null,
    maxGustKmh: null,
    maxPrecipitationMm: null,
    elevationMinM: null,
    elevationMaxM: null,
    validAt: null,
  }
}

function formatInterval(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds - minutes * 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

function formatSafetyOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'T±0'
  const absolute = Math.abs(offsetMinutes)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  const detail = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}` : `${minutes}m`
  return `${offsetMinutes < 0 ? 'T−' : 'T+'}${detail}`
}

export function StageDetail({
  event,
  stage,
  technicalStage,
  passPair,
  run,
  entries,
  spectator,
  onOpenIntro,
}: StageDetailProps) {
  const [weatherSummary, setWeatherSummary] = useState<StageWeatherSummary>(emptyWeatherSummary)
  const [weatherStatus, setWeatherStatus] = useState<EnvironmentStatus>('idle')
  const [currentEnvironment, setCurrentEnvironment] = useState<RouteEnvironmentSnapshot[]>([])
  const [otherEnvironment, setOtherEnvironment] = useState<RouteEnvironmentSnapshot[]>([])
  const [otherWeatherStatus, setOtherWeatherStatus] = useState<EnvironmentStatus>('idle')
  const [simulationOpen, setSimulationOpen] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'copied' | 'unavailable'>('idle')

  const handleEnvironmentChange = useCallback((snapshots: RouteEnvironmentSnapshot[], status: EnvironmentStatus) => {
    setWeatherStatus(status)
    setCurrentEnvironment(snapshots)
    setWeatherSummary(summarizeRouteWeather(snapshots))
  }, [])

  const otherPass = useMemo(() => {
    if (!passPair) return null
    if (stage.code === passPair.firstPass.code) return passPair.secondPass
    if (stage.code === passPair.secondPass.code) return passPair.firstPass
    return null
  }, [passPair, stage.code])

  useEffect(() => {
    if (!otherPass || !technicalStage?.geometry) {
      setOtherEnvironment([])
      setOtherWeatherStatus('idle')
      return
    }

    const nodes = buildRouteNodes(technicalStage.geometry, 2.5)
    let cancelled = false
    setOtherEnvironment([])
    setOtherWeatherStatus('loading')

    void fetchOpenMeteoForecast(nodes, otherPass.scheduledStart, event.timezone)
      .then((snapshots) => {
        if (cancelled) return
        setOtherEnvironment(snapshots)
        setOtherWeatherStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setOtherEnvironment([])
        setOtherWeatherStatus('unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [event.timezone, otherPass, technicalStage?.geometry])

  const passComparisonView = useMemo(() => {
    if (!passPair || currentEnvironment.length === 0 || otherEnvironment.length === 0) return null
    const viewingFirstPass = stage.code === passPair.firstPass.code
    const firstPassEnvironment = viewingFirstPass ? currentEnvironment : otherEnvironment
    const secondPassEnvironment = viewingFirstPass ? otherEnvironment : currentEnvironment
    return presentPassComparison(compareRouteWeather(firstPassEnvironment, secondPassEnvironment))
  }, [currentEnvironment, otherEnvironment, passPair, stage.code])

  const comparisonStatus = passComparisonView
    ? 'ready'
    : weatherStatus === 'unavailable' || otherWeatherStatus === 'unavailable'
      ? 'unavailable'
      : weatherStatus === 'loading' || otherWeatherStatus === 'loading'
        ? 'loading'
        : 'idle'

  const startSlots = useMemo(() => {
    if (!run) return []
    const stageStartMs = Date.parse(stage.scheduledStart)
    return buildPlannedStartGrid(run.carCount, run.startIntervalSeconds).map((slot) => ({
      ...slot,
      clock: formatClock(new Date(stageStartMs + slot.startOffsetSeconds * 1_000).toISOString(), event.timezone),
    }))
  }, [event.timezone, run, stage.scheduledStart])

  const safetyTimeline = useMemo(() => {
    const stageStartMs = Date.parse(stage.scheduledStart)
    return (spectator.safetyTrain ?? []).map((step) => ({
      ...step,
      clock: formatClock(new Date(stageStartMs + step.offsetMinutes * 60_000).toISOString(), event.timezone),
      relative: formatSafetyOffset(step.offsetMinutes),
    }))
  }, [event.timezone, spectator.safetyTrain, stage.scheduledStart])

  const conditions = describeStageConditions(weatherSummary)
  const geometryStatus = technicalStage?.geometryStatus ?? 'pending-verification'
  const distance = presentStageDistance(stage.distanceKm, technicalStage?.distanceKm)
  const stageLabel = stage.name.replace(/\s+1$/, '')
  const sources = useMemo(() => {
    const all = [
      ...stage.provenance.sources,
      ...(technicalStage?.provenance.sources ?? []),
      ...spectator.provenance.sources,
      ...(run?.provenance.sources ?? []),
    ]
    return Array.from(new Map(all.map((source) => [source.url, source])).values())
  }, [run, spectator.provenance.sources, stage.provenance.sources, technicalStage?.provenance.sources])

  async function handleShare() {
    const url = stageShareUrl(window.location.origin, window.location.pathname, event.id, stage.slug)
    const title = `${stage.code} ${stage.name} · ${event.name}`

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        setShareState('shared')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setShareState('copied')
    } catch {
      setShareState('unavailable')
    }
  }

  return (
    <main className="app-shell stage-detail-shell">
      <nav className="topbar" aria-label="Navegación del tramo">
        <a className="text-link" href="#/">← TODOS LOS TRAMOS</a>
        <strong>RALLY CHILE · 2026</strong>
        <button type="button" className="text-button" onClick={onOpenIntro}>WHY THIS EXISTS</button>
      </nav>

      <header className="stage-hero">
        <div>
          <p className="eyebrow">{stage.code} · STAGE BRIEF</p>
          <h1 className="editorial-title">{stageLabel}</h1>
          <p className="stage-deck">Un mismo tramo, visto como recorrido + tiempo + acceso + contexto. Sin convertir estimaciones en hechos.</p>
        </div>
        <div className="stage-hero-actions">
          <button className="primary-cta share-button" type="button" onClick={() => void handleShare()}>
            COMPARTIR TRAMO <span aria-hidden="true">↗</span>
          </button>
          <span className="share-feedback" role="status">
            {shareState === 'shared' ? 'Compartido' : shareState === 'copied' ? 'Link copiado' : shareState === 'unavailable' ? 'No se pudo copiar' : ''}
          </span>
        </div>
      </header>

      <section className="stage-facts" aria-label="Resumen del tramo">
        <div>
          <span>DISTANCIA</span>
          <strong>{distance.primary}</strong>
          {distance.technical ? <small>{distance.technical}</small> : null}
        </div>
        <div><span>PRIMER AUTO</span><strong>{formatClock(stage.scheduledStart, event.timezone)}</strong></div>
        <div><span>GEOMETRÍA</span><strong>{geometryStatus}</strong></div>
        <div><span>CLIMA</span><strong>{weatherStatus === 'ready' ? 'MODELO DISPONIBLE' : weatherStatus === 'loading' ? 'ACTUALIZANDO' : 'PENDIENTE'}</strong></div>
      </section>

      <section className="weather-summary" aria-label="Resumen climático del tramo">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WEATHER ALONG STAGE</p>
            <h2 className="editorial-subtitle">Qué cambia de punta a punta.</h2>
          </div>
          <p>Resumen derivado de los mismos nodos Open-Meteo que ves en el mapa. Modelo horario, no estaciones.</p>
        </div>
        <div className="weather-metrics">
          <article><span>TEMP</span><strong>{formatRange(weatherSummary.temperatureMinC, weatherSummary.temperatureMaxC, '°C')}</strong></article>
          <article><span>MAX GUST</span><strong>{formatValue(weatherSummary.maxGustKmh, 'km/h', 0)}</strong></article>
          <article><span>PRECIP SIGNAL</span><strong>{formatValue(weatherSummary.maxPrecipitationMm, 'mm')}</strong></article>
          <article><span>ELEV</span><strong>{formatRange(weatherSummary.elevationMinM, weatherSummary.elevationMaxM, 'm', 0)}</strong></article>
        </div>
      </section>

      {passPair ? (
        <section className="pass-comparison" aria-label={`Comparación meteorológica ${passPair.firstPass.code} contra ${passPair.secondPass.code}`}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">PASS 1 ↔ PASS 2 · MODELLED WEATHER</p>
              <h2 className="editorial-subtitle">Mismo camino. Otro horario.</h2>
            </div>
            <p>{comparisonStatus === 'ready' ? 'Deltas calculados sobre los mismos nodos del recorrido.' : comparisonStatus === 'unavailable' ? 'No hay dos forecasts comparables disponibles ahora.' : 'Comparando los dos horarios planificados…'}</p>
          </div>

          <div className="pass-selector">
            <a className={`pass-card${stage.code === passPair.firstPass.code ? ' pass-card--active' : ''}`} href={`#/${event.id}/${passPair.firstPass.slug}`}>
              <span>PASS 1 · {passPair.firstPass.code}</span>
              <strong>{formatClock(passPair.firstPass.scheduledStart, event.timezone)}</strong>
              <small>{passPair.firstPass.name}</small>
            </a>
            <span className="pass-arrow" aria-hidden="true">→</span>
            <a className={`pass-card${stage.code === passPair.secondPass.code ? ' pass-card--active' : ''}`} href={`#/${event.id}/${passPair.secondPass.slug}`}>
              <span>PASS 2 · {passPair.secondPass.code}</span>
              <strong>{formatClock(passPair.secondPass.scheduledStart, event.timezone)}</strong>
              <small>{passPair.secondPass.name}</small>
            </a>
          </div>

          <div className="pass-comparison-metrics">
            <article><span>MEAN TEMP Δ</span><strong>{passComparisonView?.temperature ?? '—'}</strong></article>
            <article><span>MAX GUST Δ</span><strong>{passComparisonView?.gusts ?? '—'}</strong></article>
            <article><span>PRECIP SIGNAL Δ</span><strong>{passComparisonView?.precipitation ?? '—'}</strong></article>
            <article><span>BIGGEST TEMP SHIFT</span><strong>{passComparisonView?.strongestShift ?? '—'}</strong></article>
          </div>
          <p className="panel-note">Δ = Pass 2 − Pass 1. Es una comparación de señal meteorológica modelada para dos horarios; no implica cambio observado de grip, barro, polvo ni estado de la calzada.</p>
        </section>
      ) : null}

      <RallyMap
        geometryStatus={geometryStatus}
        geometry={technicalStage?.geometry ?? null}
        run={run}
        spectator={spectator}
        scheduledStart={stage.scheduledStart}
        timezone={event.timezone}
        simulationEnabled={simulationOpen}
        onEnvironmentChange={handleEnvironmentChange}
      />

      <section className="intelligence-grid">
        <article className="context-panel">
          <p className="eyebrow">STAGE CONDITIONS · MODELLED CONTEXT</p>
          <h2 className="editorial-subtitle">Lo que el modelo permite decir.</h2>
          <ul className="signal-list">
            {conditions.map((condition) => <li key={condition}>{condition}</li>)}
          </ul>
          <p className="panel-note">Esto no es una lectura de grip, barro, polvo ni estado real de la calzada.</p>
        </article>

        <article className="spectator-panel">
          <p className="eyebrow">PARA IR AL TRAMO</p>
          <h2 className="editorial-subtitle">Acceso y seguridad.</h2>
          <dl className="spectator-facts">
            <div><dt>ACCESO ESPECÍFICO</dt><dd className={spectator.accessStatus === 'pending' ? 'pending-value' : ''}>{spectator.accessStatus === 'pending' ? 'PENDING OFFICIAL POINTS' : 'PUBLICADO'}</dd></div>
            <div><dt>CIERRE GENERAL</dt><dd>{spectator.roadClosureAt ? formatDateTime(spectator.roadClosureAt, event.timezone) : spectator.roadClosureText ?? 'PENDING'}</dd></div>
            <div><dt>PARKING</dt><dd className="pending-value">{spectator.parking.length > 0 ? `${spectator.parking.length} punto(s)` : 'PENDING OFFICIAL GUIDE'}</dd></div>
            <div><dt>ZONAS DE PÚBLICO</dt><dd className="pending-value">{spectator.spectatorZones.length > 0 ? `${spectator.spectatorZones.length} publicada(s)` : 'PENDING'}</dd></div>
            {spectator.capacityNote ? <div><dt>CAPACIDAD</dt><dd>{spectator.capacityNote}</dd></div> : null}
            {spectator.exitRule ? <div><dt>SALIDA</dt><dd>{spectator.exitRule}</dd></div> : null}
          </dl>
          {spectator.safetyNote ? <p className="safety-note"><strong>SEGURIDAD</strong>{spectator.safetyNote}</p> : null}
        </article>
      </section>

      {safetyTimeline.length > 0 ? (
        <section className="safety-train-panel" aria-label={`Tren de seguridad antes de ${stage.code}`}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">TREN DE SEGURIDAD · HORARIO DERIVADO</p>
              <h2 className="editorial-subtitle">La ruta se vuelve operativa antes del primer auto.</h2>
            </div>
            <p>Las horas se calculan desde la largada prevista de {formatClock(stage.scheduledStart, event.timezone)} usando los offsets publicados para el dispositivo de seguridad.</p>
          </div>
          <div className="safety-timeline">
            {safetyTimeline.map((step) => (
              <article className="safety-step" key={step.id}>
                <span className="safety-step-offset">{step.relative}</span>
                <strong>{step.clock}</strong>
                <h3>{step.label}</h3>
                {step.description ? <p>{step.description}</p> : null}
              </article>
            ))}
            <article className="safety-step safety-step--start">
              <span className="safety-step-offset">T±0</span>
              <strong>{formatClock(stage.scheduledStart, event.timezone)}</strong>
              <h3>{stage.code} · primer auto</h3>
              <p>Inicio previsto de la competencia en {stageLabel}.</p>
            </article>
          </div>
          <p className="panel-note">Los horarios operativos pueden cambiar por instrucciones del organizador, capacidad, seguridad o dirección de carrera. La publicación oficial prevalece sobre esta derivación.</p>
        </section>
      ) : null}

      <section className="simulation-gate" aria-label="Simulación opcional del tramo">
        <div>
          <p className="eyebrow">CAPA OPCIONAL</p>
          <h2 className="editorial-subtitle">Simular el paso de los autos.</h2>
          <p>{run ? 'Los autos siguen siendo slots genéricos y simulados. No son timing en vivo ni asignación real de pilotos.' : 'Este tramo ya tiene ficha territorial y clima; el modelo de movimiento todavía no está calibrado para esta etapa.'}</p>
        </div>
        <button className={`simulation-button${simulationOpen ? ' simulation-button--active' : ''}`} type="button" onClick={() => setSimulationOpen((current) => !current)} disabled={!run}>
          {!run ? 'SIMULACIÓN PENDIENTE' : simulationOpen ? '■ CERRAR SIMULACIÓN' : '▶ SIMULAR TRAMO'}
        </button>
      </section>

      {simulationOpen && run ? (
        <section className="simulation-details">
          <div className="simulation-summary">
            <div><span>FLOTA</span><strong>{run.carCount} SIM {run.priority}</strong></div>
            <div><span>INTERVALO</span><strong>{formatInterval(run.startIntervalSeconds)}</strong></div>
            <div><span>PLAYBACK</span><strong>{run.playbackSpeed}×</strong></div>
            <div><span>BENCHMARK</span><strong>{Math.floor(run.expectedDurationSeconds / 60)}:{(run.expectedDurationSeconds % 60).toFixed(1).padStart(4, '0')}</strong></div>
          </div>
          <div className="start-grid-slots">
            {startSlots.map((slot) => (
              <div className="start-slot" key={slot.simulationId}>
                <span>{slot.simulationId}</span>
                <strong>{slot.clock}</strong>
              </div>
            ))}
          </div>
          <div className="entry-roster-grid compact-roster">
            {entries.map((entry) => (
              <article className="entry-card" key={entry.carNo}>
                <div className="entry-number">#{entry.carNo}</div>
                <div><strong>{entry.driver}</strong><span>{entry.coDriver}</span><small>{entry.car}</small></div>
              </article>
            ))}
          </div>
          <p className="panel-note">Roster oficial de inscriptos mostrado como contexto. No se mapea a SIM-01…SIM-10 hasta contar con una lista oficial de largada.</p>
        </section>
      ) : null}

      <section className="sources stage-sources" aria-label="Fuentes del tramo">
        <div>
          <p className="eyebrow">PROVENANCE</p>
          <h2 className="editorial-subtitle">Qué sabemos y de dónde sale.</h2>
        </div>
        <div>
          <ul>
            {sources.map((source) => (
              <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a><span>consultado {source.accessedAt}</span></li>
            ))}
          </ul>
          {stage.provenance.note ? <p className="source-note">{stage.provenance.note}</p> : null}
          {technicalStage?.provenance.note ? <p className="source-note">{technicalStage.provenance.note}</p> : null}
          {spectator.provenance.note ? <p className="source-note">{spectator.provenance.note}</p> : null}
        </div>
      </section>

      <footer>Proyecto open-source no oficial. No afiliado a FIA, WRC Promoter GmbH ni a la organización del evento.</footer>
    </main>
  )
}
