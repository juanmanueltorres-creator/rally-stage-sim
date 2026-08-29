import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl'
import type { SimulatedStageRun, StageGeometryStatus, StageLineString } from '../domain/rally'
import { buildRouteNodes } from '../map/environmentNodes'
import { presentEnvironmentSnapshot } from '../map/environmentView'
import { fetchOpenMeteoForecast, type RouteEnvironmentSnapshot } from '../map/openMeteo'
import { buildStageGeoJson } from '../map/stageGeoJson'
import { fleetSnapshot } from '../simulation/fleet'
import { buildPlannedStartGrid } from '../simulation/startGrid'

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#090b0f',
      },
    },
  ],
}

type EnvironmentStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

interface RallyMapProps {
  geometryStatus: StageGeometryStatus
  geometry: StageLineString | null
  run: SimulatedStageRun | null
  scheduledStart: string
  timezone: string
}

function geometryMessage(status: StageGeometryStatus, hasGeometry: boolean): string {
  if (!hasGeometry) return 'Route geometry pending verification — no synthetic route drawn'
  if (status === 'verified') return 'Verified stage geometry available'
  return 'Reference reconstruction — organizer map + OpenStreetMap, not an official GPS trace'
}

function formatInterval(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds - minutes * 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

export function RallyMap({
  geometryStatus,
  geometry,
  run,
  scheduledStart,
  timezone,
}: RallyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const simulationRef = useRef<HTMLSpanElement | null>(null)
  const nodes = useMemo(() => (geometry ? buildRouteNodes(geometry, 2.5) : []), [geometry])
  const startGrid = useMemo(
    () => (run ? buildPlannedStartGrid(run.carCount, run.startIntervalSeconds) : []),
    [run],
  )
  const [environment, setEnvironment] = useState<RouteEnvironmentSnapshot[]>([])
  const [environmentStatus, setEnvironmentStatus] = useState<EnvironmentStatus>('idle')

  const environmentCards = useMemo(
    () => environment.map((snapshot) => ({ snapshot, view: presentEnvironmentSnapshot(snapshot) })),
    [environment],
  )

  useEffect(() => {
    if (!geometry || nodes.length === 0) {
      setEnvironment([])
      setEnvironmentStatus('idle')
      return
    }

    let cancelled = false
    setEnvironmentStatus('loading')

    void fetchOpenMeteoForecast(nodes, scheduledStart, timezone)
      .then((snapshots) => {
        if (cancelled) return
        setEnvironment(snapshots)
        setEnvironmentStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setEnvironment([])
        setEnvironmentStatus('unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [geometry, nodes, scheduledStart, timezone])

  useEffect(() => {
    if (!containerRef.current) return

    const initialCoordinate = geometry?.coordinates[0] ?? [-72.70, -37.21]
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: initialCoordinate,
      zoom: geometry ? 11 : 8,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    let animationFrameId: number | null = null

    map.on('load', () => {
      if (!geometry || !run || startGrid.length === 0) return

      const stageStartMs = Date.parse(scheduledStart)
      const expectedDurationMs = run.expectedDurationSeconds * 1_000
      const lastStartOffsetMs = startGrid[startGrid.length - 1].startOffsetSeconds * 1_000
      const scenarioDurationMs = lastStartOffsetMs + expectedDurationMs
      const initialFleet = fleetSnapshot(geometry, startGrid, stageStartMs, expectedDurationMs, stageStartMs)
      const sourceData = buildStageGeoJson(geometry, initialFleet, geometryStatus, nodes)

      map.addSource('stage-simulation', {
        type: 'geojson',
        data: sourceData,
      })

      map.addLayer({
        id: 'stage-route',
        type: 'line',
        source: 'stage-simulation',
        filter: ['==', ['get', 'kind'], 'stage-route'],
        paint: {
          'line-color': '#ffd54a',
          'line-width': 4,
          'line-opacity': 0.92,
        },
      })

      map.addLayer({
        id: 'environment-nodes',
        type: 'circle',
        source: 'stage-simulation',
        filter: ['==', ['get', 'kind'], 'environment-node'],
        paint: {
          'circle-radius': 4,
          'circle-color': '#7bdff2',
          'circle-stroke-color': '#081014',
          'circle-stroke-width': 2,
        },
      })

      map.addLayer({
        id: 'stage-start',
        type: 'circle',
        source: 'stage-simulation',
        filter: ['==', ['get', 'kind'], 'stage-start'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#6ee7a8',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })

      map.addLayer({
        id: 'stage-finish',
        type: 'circle',
        source: 'stage-simulation',
        filter: ['==', ['get', 'kind'], 'stage-finish'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#f5f5f2',
          'circle-stroke-color': '#ff6a4a',
          'circle-stroke-width': 3,
        },
      })

      map.addLayer({
        id: 'simulated-vehicle',
        type: 'circle',
        source: 'stage-simulation',
        filter: ['==', ['get', 'kind'], 'simulated-vehicle'],
        paint: {
          'circle-radius': [
            'match',
            ['get', 'status'],
            'waiting', 4,
            'finished', 5,
            7,
          ],
          'circle-color': [
            'match',
            ['get', 'status'],
            'waiting', '#626a73',
            'finished', '#f5f5f2',
            '#ff5d5d',
          ],
          'circle-opacity': [
            'match',
            ['get', 'status'],
            'waiting', 0.45,
            0.95,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })

      const bounds = geometry.coordinates.reduce(
        (acc, coordinate) => acc.extend(coordinate),
        new maplibregl.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]),
      )

      map.fitBounds(bounds, { padding: 48, duration: 0 })

      const realStartMs = performance.now()

      const animate = (realNowMs: number) => {
        const realElapsedMs = realNowMs - realStartMs
        const virtualElapsedMs = (realElapsedMs * run.playbackSpeed) % scenarioDurationMs
        const virtualNowMs = stageStartMs + virtualElapsedMs
        const snapshots = fleetSnapshot(geometry, startGrid, stageStartMs, expectedDurationMs, virtualNowMs)
        const source = map.getSource('stage-simulation') as GeoJSONSource | undefined

        source?.setData(buildStageGeoJson(geometry, snapshots, geometryStatus, nodes))

        if (simulationRef.current) {
          const runningCount = snapshots.filter((snapshot) => snapshot.status === 'running').length
          const finishedCount = snapshots.filter((snapshot) => snapshot.status === 'finished').length
          simulationRef.current.textContent = `${run.carCount} SIM ${run.priority} · ${runningCount} ON STAGE · ${finishedCount} FIN · ${formatInterval(run.startIntervalSeconds)} slots · ${run.playbackSpeed}×`
        }

        animationFrameId = requestAnimationFrame(animate)
      }

      animationFrameId = requestAnimationFrame(animate)
    })

    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
      map.remove()
    }
  }, [geometry, geometryStatus, nodes, run, scheduledStart, startGrid])

  return (
    <>
      <section className="map-panel" aria-label="Turquía rally stage simulation">
        <div ref={containerRef} className="map-canvas" />
        <div className="map-status" role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>{geometryMessage(geometryStatus, Boolean(geometry))}</span>
          {geometry && run ? (
            <span ref={simulationRef}>
              {run.carCount} SIM {run.priority} · 1 ON STAGE · 0 FIN · {formatInterval(run.startIntervalSeconds)} slots · {run.playbackSpeed}×
            </span>
          ) : null}
        </div>
      </section>

      <section className="environment-panel" aria-label="Modelled environmental route context">
        <div className="environment-header">
          <div>
            <p className="eyebrow">MODELLED ROUTE CONTEXT · OPEN-METEO</p>
            <h2>START → 2.5 km nodes → FINISH</h2>
          </div>
          <p>
            Spatial sampling for visualization. Weather values are modelled context, not station observations or 2.5 km meteorological resolution.
          </p>
        </div>

        {environmentStatus === 'loading' ? (
          <p className="environment-state">Loading forecast context for the planned stage start…</p>
        ) : null}

        {environmentStatus === 'unavailable' ? (
          <p className="environment-state environment-state--warning">
            Forecast context is outside the available model horizon or temporarily unavailable. Route nodes remain valid.
          </p>
        ) : null}

        {environmentStatus === 'ready' ? (
          <div className="environment-grid">
            {environmentCards.map(({ snapshot, view }) => (
              <article
                className={`environment-node-card${snapshot.node.role !== 'context' ? ' environment-node-card--terminal' : ''}`}
                key={snapshot.node.id}
              >
                <div className="environment-node-heading">
                  <strong>{view.position}</strong>
                  <span>{view.validAt}</span>
                </div>
                <div className="environment-node-values">
                  <div><span>TEMP</span><strong>{view.temperature}</strong></div>
                  <div><span>WIND</span><strong>{view.wind}</strong></div>
                  <div><span>GUST</span><strong>{view.gust}</strong></div>
                  <div><span>ELEV</span><strong>{view.elevation}</strong></div>
                  <div><span>PRECIP</span><strong>{view.precipitation}</strong></div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <p className="environment-source">
          Source: <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo Weather Forecast API</a> · requested in {timezone} for the planned SS1 start.
        </p>
      </section>
    </>
  )
}
