import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, MapLayerMouseEvent, StyleSpecification } from 'maplibre-gl'
import type { SimulatedStageRun, StageGeometryStatus, StageLineString, StageSpectatorInfo } from '../domain/rally'
import { buildRouteNodes } from '../map/environmentNodes'
import { presentEnvironmentSnapshot } from '../map/environmentView'
import { fetchOpenMeteoForecast, type RouteEnvironmentSnapshot } from '../map/openMeteo'
import { buildStageGeoJson } from '../map/stageGeoJson'
import { describeGeometryStatus } from '../presentation/geometryStatus'
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
        'background-color': '#071017',
      },
    },
  ],
}

export type EnvironmentStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

interface RallyMapProps {
  geometryStatus: StageGeometryStatus
  geometry: StageLineString | null
  run: SimulatedStageRun | null
  spectator?: StageSpectatorInfo
  scheduledStart: string
  timezone: string
  simulationEnabled?: boolean
  onEnvironmentChange?: (snapshots: RouteEnvironmentSnapshot[], status: EnvironmentStatus) => void
}

function formatInterval(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds - minutes * 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

function addSpectatorPopup(map: maplibregl.Map, layerId: string) {
  const onClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0]
    if (!feature || feature.geometry.type !== 'Point') return

    const coordinates = feature.geometry.coordinates as [number, number]
    const container = document.createElement('div')
    container.className = 'map-popup-content'

    const title = document.createElement('strong')
    title.textContent = typeof feature.properties?.label === 'string' ? feature.properties.label : 'Punto oficial'
    container.append(title)

    if (typeof feature.properties?.description === 'string' && feature.properties.description.length > 0) {
      const description = document.createElement('p')
      description.textContent = feature.properties.description
      container.append(description)
    }

    new maplibregl.Popup({ closeButton: true, offset: 12 })
      .setLngLat(coordinates)
      .setDOMContent(container)
      .addTo(map)
  }

  const onEnter = () => {
    map.getCanvas().style.cursor = 'pointer'
  }

  const onLeave = () => {
    map.getCanvas().style.cursor = ''
  }

  map.on('click', layerId, onClick)
  map.on('mouseenter', layerId, onEnter)
  map.on('mouseleave', layerId, onLeave)

  return () => {
    map.off('click', layerId, onClick)
    map.off('mouseenter', layerId, onEnter)
    map.off('mouseleave', layerId, onLeave)
  }
}

export function RallyMap({
  geometryStatus,
  geometry,
  run,
  spectator,
  scheduledStart,
  timezone,
  simulationEnabled = true,
  onEnvironmentChange,
}: RallyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const simulationRef = useRef<HTMLSpanElement | null>(null)
  const nodes = useMemo(() => (geometry ? buildRouteNodes(geometry, 2.5) : []), [geometry])
  const startGrid = useMemo(
    () => (run ? buildPlannedStartGrid(run.carCount, run.startIntervalSeconds) : []),
    [run],
  )
  const spectatorContext = useMemo(() => ({
    spectatorZones: spectator?.spectatorZones ?? [],
    parking: spectator?.parking ?? [],
  }), [spectator?.parking, spectator?.spectatorZones])
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
      onEnvironmentChange?.([], 'idle')
      return
    }

    let cancelled = false
    setEnvironmentStatus('loading')
    onEnvironmentChange?.([], 'loading')

    void fetchOpenMeteoForecast(nodes, scheduledStart, timezone)
      .then((snapshots) => {
        if (cancelled) return
        setEnvironment(snapshots)
        setEnvironmentStatus('ready')
        onEnvironmentChange?.(snapshots, 'ready')
      })
      .catch(() => {
        if (cancelled) return
        setEnvironment([])
        setEnvironmentStatus('unavailable')
        onEnvironmentChange?.([], 'unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [geometry, nodes, onEnvironmentChange, scheduledStart, timezone])

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
    const removePopupHandlers: Array<() => void> = []

    map.on('load', () => {
      if (!geometry) return

      const simulationActive = Boolean(simulationEnabled && run && startGrid.length > 0)
      const stageStartMs = Date.parse(scheduledStart)
      const expectedDurationMs = run ? run.expectedDurationSeconds * 1_000 : 0
      const initialFleet = simulationActive && run
        ? fleetSnapshot(geometry, startGrid, stageStartMs, expectedDurationMs, stageStartMs)
        : []

      map.addSource('stage-context', {
        type: 'geojson',
        data: buildStageGeoJson(geometry, initialFleet, geometryStatus, nodes, spectatorContext),
      })

      map.addLayer({
        id: 'stage-route',
        type: 'line',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'stage-route'],
        paint: {
          'line-color': '#e3ad4b',
          'line-width': 4,
          'line-opacity': 0.94,
        },
      })

      map.addLayer({
        id: 'environment-nodes',
        type: 'circle',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'environment-node'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#57d1e6',
          'circle-stroke-color': '#071017',
          'circle-stroke-width': 2,
        },
      })

      map.addLayer({
        id: 'stage-start',
        type: 'circle',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'stage-start'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#69d39d',
          'circle-stroke-color': '#f4efe5',
          'circle-stroke-width': 2,
        },
      })

      map.addLayer({
        id: 'stage-finish',
        type: 'circle',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'stage-finish'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#f4efe5',
          'circle-stroke-color': '#e66b52',
          'circle-stroke-width': 3,
        },
      })

      map.addLayer({
        id: 'spectator-zones',
        type: 'circle',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'spectator-zone'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#69d39d',
          'circle-stroke-color': '#071017',
          'circle-stroke-width': 3,
        },
      })

      map.addLayer({
        id: 'spectator-parking',
        type: 'circle',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'spectator-parking'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#e3ad4b',
          'circle-stroke-color': '#071017',
          'circle-stroke-width': 3,
        },
      })

      removePopupHandlers.push(addSpectatorPopup(map, 'spectator-zones'))
      removePopupHandlers.push(addSpectatorPopup(map, 'spectator-parking'))

      if (simulationActive && run) {
        map.addLayer({
          id: 'simulated-vehicle',
          type: 'circle',
          source: 'stage-context',
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
              'waiting', '#66717a',
              'finished', '#f4efe5',
              '#ff6258',
            ],
            'circle-opacity': [
              'match',
              ['get', 'status'],
              'waiting', 0.45,
              0.98,
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        })
      }

      const bounds = geometry.coordinates.reduce(
        (acc, coordinate) => acc.extend(coordinate),
        new maplibregl.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]),
      )

      for (const point of [...spectatorContext.spectatorZones, ...spectatorContext.parking]) {
        if (point.coordinate) bounds.extend(point.coordinate)
      }

      map.fitBounds(bounds, { padding: 48, duration: 0 })

      if (!simulationActive || !run) return

      const lastStartOffsetMs = startGrid[startGrid.length - 1].startOffsetSeconds * 1_000
      const scenarioDurationMs = lastStartOffsetMs + expectedDurationMs
      const realStartMs = performance.now()

      const animate = (realNowMs: number) => {
        const realElapsedMs = realNowMs - realStartMs
        const virtualElapsedMs = (realElapsedMs * run.playbackSpeed) % scenarioDurationMs
        const virtualNowMs = stageStartMs + virtualElapsedMs
        const snapshots = fleetSnapshot(geometry, startGrid, stageStartMs, expectedDurationMs, virtualNowMs)
        const source = map.getSource('stage-context') as GeoJSONSource | undefined

        source?.setData(buildStageGeoJson(geometry, snapshots, geometryStatus, nodes, spectatorContext))

        if (simulationRef.current) {
          const runningCount = snapshots.filter((snapshot) => snapshot.status === 'running').length
          const finishedCount = snapshots.filter((snapshot) => snapshot.status === 'finished').length
          simulationRef.current.textContent = `${run.carCount} SIM ${run.priority} · ${runningCount} EN TRAMO · ${finishedCount} FIN · ${formatInterval(run.startIntervalSeconds)} slots · ${run.playbackSpeed}×`
        }

        animationFrameId = requestAnimationFrame(animate)
      }

      animationFrameId = requestAnimationFrame(animate)
    })

    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
      removePopupHandlers.forEach((remove) => remove())
      map.remove()
    }
  }, [geometry, geometryStatus, nodes, run, scheduledStart, simulationEnabled, spectatorContext, startGrid])

  return (
    <>
      <section className="map-panel" aria-label="Mapa del tramo">
        <div ref={containerRef} className="map-canvas" />
        <div className="map-status" role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>{describeGeometryStatus(geometryStatus, Boolean(geometry))}</span>
          {geometry && run && simulationEnabled ? (
            <span ref={simulationRef}>
              {run.carCount} SIM {run.priority} · {formatInterval(run.startIntervalSeconds)} slots · {run.playbackSpeed}×
            </span>
          ) : geometry ? <span>TRAMO + CONTEXTO AMBIENTAL</span> : null}
          {spectatorContext.spectatorZones.length > 0 || spectatorContext.parking.length > 0 ? (
            <span>{spectatorContext.spectatorZones.length} ZONA(S) · {spectatorContext.parking.length} PARKING</span>
          ) : null}
        </div>
      </section>

      <section className="environment-panel" aria-label="Contexto ambiental modelado a lo largo del tramo">
        <div className="environment-header">
          <div>
            <p className="eyebrow">CLIMA A LO LARGO DEL TRAMO · OPEN-METEO</p>
            <h2>START → nodos cada 2,5 km → FINISH</h2>
          </div>
          <p>
            Muestreo espacial sobre la geometría de referencia. Son valores modelados, no observaciones de estación ni una afirmación de resolución meteorológica de 2,5 km.
          </p>
        </div>

        {environmentStatus === 'loading' ? (
          <p className="environment-state">Buscando el pronóstico para la hora prevista del tramo…</p>
        ) : null}

        {environmentStatus === 'unavailable' ? (
          <p className="environment-state environment-state--warning">
            El pronóstico está fuera del horizonte disponible o temporalmente inaccesible. El recorrido y los nodos siguen siendo válidos.
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
                  <div><span>VIENTO</span><strong>{view.wind}</strong></div>
                  <div><span>RÁFAGA</span><strong>{view.gust}</strong></div>
                  <div><span>ELEV</span><strong>{view.elevation}</strong></div>
                  <div><span>PRECIP</span><strong>{view.precipitation}</strong></div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <p className="environment-source">
          Fuente: <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo Weather Forecast API</a> · consulta en {timezone} para la hora prevista del tramo.
        </p>
      </section>
    </>
  )
}
