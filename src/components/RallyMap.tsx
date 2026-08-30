import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl'
import type { SimulatedStageRun, SpectatorPoint, StageGeometryStatus, StageLineString, StageSpectatorInfo } from '../domain/rally'
import { buildEnvironmentChips } from '../map/environmentChips'
import { buildRouteNodes } from '../map/environmentNodes'
import { presentEnvironmentSnapshot } from '../map/environmentView'
import { MAP_STYLE } from '../map/mapStyle'
import type { RouteEnvironmentSnapshot } from '../map/openMeteo'
import { buildDirectionArrows, buildDistanceMarkers } from '../map/routeAnnotations'
import { fetchStageEnvironment, type RouteEnvironmentDataset, type WeatherMode } from '../map/stageEnvironment'
import { buildStageGeoJson, type StageMapAnnotations } from '../map/stageGeoJson'
import { describeGeometryStatus } from '../presentation/geometryStatus'
import { fleetSnapshot } from '../simulation/fleet'
import { buildPlannedStartGrid } from '../simulation/startGrid'
import { StageMapContextStrip } from './StageMapContextStrip'

export type EnvironmentStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

interface RallyMapProps {
  geometryStatus: StageGeometryStatus
  geometry: StageLineString | null
  run: SimulatedStageRun | null
  spectator?: StageSpectatorInfo
  scheduledStart: string
  timezone: string
  distancePrimary?: string
  distanceTechnical?: string | null
  simulationEnabled?: boolean
  onEnvironmentChange?: (
    snapshots: RouteEnvironmentSnapshot[],
    status: EnvironmentStatus,
    mode?: WeatherMode | null,
    sourceLabel?: string,
    methodologyNote?: string,
  ) => void
}

function formatInterval(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds - minutes * 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

function formatClock(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso))
}

function isSpatiallySourced(point: SpectatorPoint): point is SpectatorPoint & { coordinate: [number, number] } {
  return Boolean(point.coordinate && point.provenance && point.provenance.sources.length > 0)
}

function closureLabel(spectator: StageSpectatorInfo | undefined, timezone: string): string {
  if (spectator?.roadClosureAt) return `${formatClock(spectator.roadClosureAt, timezone)} PREV`
  if (spectator?.roadClosureText) return spectator.roadClosureText.toUpperCase()
  return 'PENDING'
}

function publicAccessLabel(spectator: StageSpectatorInfo | undefined): string {
  const publicPoints = [
    ...(spectator?.spectatorZones ?? []),
    ...(spectator?.parking ?? []),
    ...(spectator?.accessPoints ?? []),
  ].filter(isSpatiallySourced)
  return publicPoints.length > 0 ? 'OFFICIAL POINTS' : 'PENDING OFFICIAL POINTS'
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

function createOverlayElement(className: string, text: string, rotationDeg?: number): HTMLDivElement {
  const element = document.createElement('div')
  element.className = className
  const content = document.createElement('span')
  content.textContent = text
  if (rotationDeg !== undefined) content.style.transform = `rotate(${rotationDeg}deg)`
  element.append(content)
  return element
}

function addOverlayMarker(
  map: maplibregl.Map,
  coordinate: [number, number],
  text: string,
  className: string,
  anchor: 'center' | 'top' | 'bottom' = 'center',
  rotationDeg?: number,
): maplibregl.Marker {
  return new maplibregl.Marker({
    element: createOverlayElement(className, text, rotationDeg),
    anchor,
  }).setLngLat(coordinate).addTo(map)
}

export function RallyMap({
  geometryStatus,
  geometry,
  run,
  spectator,
  scheduledStart,
  timezone,
  distancePrimary = '—',
  distanceTechnical = null,
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
    accessPoints: spectator?.accessPoints ?? [],
    noSpectatorZones: spectator?.noSpectatorZones ?? [],
  }), [spectator?.accessPoints, spectator?.noSpectatorZones, spectator?.parking, spectator?.spectatorZones])
  const [environmentDataset, setEnvironmentDataset] = useState<RouteEnvironmentDataset | null>(null)
  const [environmentStatus, setEnvironmentStatus] = useState<EnvironmentStatus>('idle')

  const environment = environmentDataset?.snapshots ?? []
  const environmentCards = useMemo(
    () => environment.map((snapshot) => ({ snapshot, view: presentEnvironmentSnapshot(snapshot) })),
    [environment],
  )
  const mapAnnotations = useMemo<StageMapAnnotations>(() => ({
    distanceMarkers: geometry ? buildDistanceMarkers(geometry, 5) : [],
    directionArrows: geometry ? buildDirectionArrows(geometry, 5) : [],
    environmentChips: environmentDataset
      ? buildEnvironmentChips(environmentDataset.snapshots, environmentDataset.mode, 5)
      : [],
  }), [environmentDataset, geometry])

  useEffect(() => {
    if (!geometry || nodes.length === 0) {
      setEnvironmentDataset(null)
      setEnvironmentStatus('idle')
      onEnvironmentChange?.([], 'idle', null)
      return
    }

    let cancelled = false
    setEnvironmentDataset(null)
    setEnvironmentStatus('loading')
    onEnvironmentChange?.([], 'loading', null)

    void fetchStageEnvironment(nodes, scheduledStart, timezone)
      .then((dataset) => {
        if (cancelled) return
        setEnvironmentDataset(dataset)
        setEnvironmentStatus('ready')
        onEnvironmentChange?.(
          dataset.snapshots,
          'ready',
          dataset.mode,
          dataset.sourceLabel,
          dataset.methodologyNote,
        )
      })
      .catch(() => {
        if (cancelled) return
        setEnvironmentDataset(null)
        setEnvironmentStatus('unavailable')
        onEnvironmentChange?.([], 'unavailable', null)
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
    const overlayMarkers: maplibregl.Marker[] = []

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
        data: buildStageGeoJson(geometry, initialFleet, geometryStatus, nodes, spectatorContext, mapAnnotations),
      })

      map.addLayer({
        id: 'stage-route',
        type: 'line',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'stage-route'],
        paint: { 'line-color': '#e3ad4b', 'line-width': 4, 'line-opacity': 0.94 },
      })

      map.addLayer({
        id: 'environment-nodes',
        type: 'circle',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'environment-node'],
        paint: { 'circle-radius': 5, 'circle-color': '#57d1e6', 'circle-stroke-color': '#071017', 'circle-stroke-width': 2 },
      })

      map.addLayer({
        id: 'stage-start',
        type: 'circle',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'stage-start'],
        paint: { 'circle-radius': 7, 'circle-color': '#69d39d', 'circle-stroke-color': '#f4efe5', 'circle-stroke-width': 2 },
      })

      map.addLayer({
        id: 'stage-finish',
        type: 'circle',
        source: 'stage-context',
        filter: ['==', ['get', 'kind'], 'stage-finish'],
        paint: { 'circle-radius': 7, 'circle-color': '#f4efe5', 'circle-stroke-color': '#e66b52', 'circle-stroke-width': 3 },
      })

      const spectatorLayerDefinitions = [
        { id: 'spectator-zones', kind: 'spectator-zone', color: '#69d39d' },
        { id: 'spectator-parking', kind: 'spectator-parking', color: '#e3ad4b' },
        { id: 'official-access', kind: 'official-access', color: '#57d1e6' },
        { id: 'no-spectator-zones', kind: 'no-spectator-zone', color: '#e66b52' },
      ] as const

      for (const layer of spectatorLayerDefinitions) {
        map.addLayer({
          id: layer.id,
          type: 'circle',
          source: 'stage-context',
          filter: ['==', ['get', 'kind'], layer.kind],
          paint: { 'circle-radius': 8, 'circle-color': layer.color, 'circle-stroke-color': '#071017', 'circle-stroke-width': 3 },
        })
        removePopupHandlers.push(addSpectatorPopup(map, layer.id))
      }

      const startNode = nodes.find((node) => node.role === 'start')
      const finishNode = nodes.find((node) => node.role === 'finish')
      if (startNode) overlayMarkers.push(addOverlayMarker(map, startNode.coordinate, 'START', 'map-static-label map-static-label--start', 'bottom'))
      if (finishNode) overlayMarkers.push(addOverlayMarker(map, finishNode.coordinate, 'FINISH', 'map-static-label map-static-label--finish', 'bottom'))
      for (const marker of mapAnnotations.distanceMarkers) {
        overlayMarkers.push(addOverlayMarker(map, marker.coordinate, marker.label, 'map-static-label map-static-label--distance', 'bottom'))
      }
      for (const arrow of mapAnnotations.directionArrows) {
        overlayMarkers.push(addOverlayMarker(map, arrow.coordinate, '↑', 'map-direction-arrow', 'center', arrow.bearingDeg))
      }
      for (const chip of mapAnnotations.environmentChips) {
        overlayMarkers.push(addOverlayMarker(map, chip.coordinate, chip.label, 'map-environment-chip', 'top'))
      }

      const sourcedSpectatorLabels: Array<{ point: SpectatorPoint; prefix: string; className: string }> = [
        ...spectatorContext.spectatorZones.map((point) => ({ point, prefix: 'SPECTATOR', className: 'map-official-label map-official-label--spectator' })),
        ...spectatorContext.parking.map((point) => ({ point, prefix: 'PARKING', className: 'map-official-label map-official-label--parking' })),
        ...spectatorContext.accessPoints.map((point) => ({ point, prefix: 'ACCESS', className: 'map-official-label map-official-label--access' })),
        ...spectatorContext.noSpectatorZones.map((point) => ({ point, prefix: 'NO SPECTATOR', className: 'map-official-label map-official-label--prohibited' })),
      ]
      for (const item of sourcedSpectatorLabels) {
        if (!isSpatiallySourced(item.point)) continue
        overlayMarkers.push(addOverlayMarker(map, item.point.coordinate, `${item.prefix} · ${item.point.label}`, item.className, 'bottom'))
      }

      if (simulationActive && run) {
        map.addLayer({
          id: 'simulated-vehicle',
          type: 'circle',
          source: 'stage-context',
          filter: ['==', ['get', 'kind'], 'simulated-vehicle'],
          paint: {
            'circle-radius': ['match', ['get', 'status'], 'waiting', 4, 'finished', 5, 7],
            'circle-color': ['match', ['get', 'status'], 'waiting', '#66717a', 'finished', '#f4efe5', '#ff6258'],
            'circle-opacity': ['match', ['get', 'status'], 'waiting', 0.45, 0.98],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        })
      }

      const bounds = geometry.coordinates.reduce(
        (acc, coordinate) => acc.extend(coordinate),
        new maplibregl.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]),
      )

      for (const point of [
        ...spectatorContext.spectatorZones,
        ...spectatorContext.parking,
        ...spectatorContext.accessPoints,
        ...spectatorContext.noSpectatorZones,
      ]) {
        if (isSpatiallySourced(point)) bounds.extend(point.coordinate)
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

        source?.setData(buildStageGeoJson(geometry, snapshots, geometryStatus, nodes, spectatorContext, mapAnnotations))

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
      overlayMarkers.forEach((marker) => marker.remove())
      map.remove()
    }
  }, [geometry, geometryStatus, mapAnnotations, nodes, run, scheduledStart, simulationEnabled, spectatorContext, startGrid])

  const officialSpatialCount = [
    ...spectatorContext.spectatorZones,
    ...spectatorContext.parking,
    ...spectatorContext.accessPoints,
  ].filter(isSpatiallySourced).length

  return (
    <>
      <section className="map-intelligence-block" aria-label="Mapa e inteligencia visible del tramo">
        <StageMapContextStrip
          distancePrimary={distancePrimary}
          distanceTechnical={distanceTechnical}
          startTime={formatClock(scheduledStart, timezone)}
          geometryStatus={geometryStatus}
          weatherStatus={environmentStatus}
          weatherMode={environmentDataset?.mode ?? null}
          closure={closureLabel(spectator, timezone)}
          publicAccess={publicAccessLabel(spectator)}
        />
        <div className="map-panel" aria-label="Mapa del tramo">
          <div ref={containerRef} className="map-canvas" />
          <div className="map-status" role="status">
            <span className="status-dot" aria-hidden="true" />
            <span>{describeGeometryStatus(geometryStatus, Boolean(geometry))}</span>
            {geometry && run && simulationEnabled ? (
              <span ref={simulationRef}>{run.carCount} SIM {run.priority} · {formatInterval(run.startIntervalSeconds)} slots · {run.playbackSpeed}×</span>
            ) : geometry ? <span>TRAMO + CONTEXTO AMBIENTAL</span> : null}
            {officialSpatialCount > 0 ? <span>{officialSpatialCount} PUNTO(S) OFICIAL(ES)</span> : null}
          </div>
        </div>
      </section>

      <section className="environment-panel" aria-label="Contexto ambiental a lo largo del tramo">
        <div className="environment-header">
          <div>
            <p className="eyebrow">CLIMA A LO LARGO DEL TRAMO · {environmentDataset?.sourceLabel ?? 'OPEN-METEO'}</p>
            <h2>START → nodos cada 2,5 km → FINISH</h2>
          </div>
          <p>Muestreo espacial sobre la geometría de referencia. Los valores son contexto meteorológico, no una afirmación de resolución de 2,5 km ni una lectura del estado real del camino.</p>
        </div>

        {environmentStatus === 'loading' ? <p className="environment-state">Resolviendo forecast y, si hace falta, referencia histórica…</p> : null}
        {environmentStatus === 'unavailable' ? (
          <p className="environment-state environment-state--warning">No se pudo cargar forecast ni referencia histórica. El recorrido y sus referencias espaciales siguen siendo válidos.</p>
        ) : null}

        {environmentStatus === 'ready' ? (
          <div className="environment-grid">
            {environmentCards.map(({ snapshot, view }) => (
              <article className={`environment-node-card${snapshot.node.role !== 'context' ? ' environment-node-card--terminal' : ''}`} key={snapshot.node.id}>
                <div className="environment-node-heading"><strong>{view.position}</strong><span>{view.validAt}</span></div>
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

        {environmentDataset?.methodologyNote ? <p className="environment-mode-note">{environmentDataset.methodologyNote}</p> : null}
        <p className="environment-source">Fuente activa: {environmentDataset?.sourceLabel ?? 'WEATHER PENDING'} · consulta en {timezone} para la hora local prevista del tramo.</p>
      </section>
    </>
  )
}
