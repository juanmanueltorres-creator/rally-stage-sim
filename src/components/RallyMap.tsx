import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl'
import type { SimulatedStageRun, StageGeometryStatus, StageLineString } from '../domain/rally'
import { buildStageGeoJson } from '../map/stageGeoJson'
import { vehicleSnapshot } from '../simulation/vehicle'

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

interface RallyMapProps {
  geometryStatus: StageGeometryStatus
  geometry: StageLineString | null
  run: SimulatedStageRun | null
}

function geometryMessage(status: StageGeometryStatus, hasGeometry: boolean): string {
  if (!hasGeometry) return 'Route geometry pending verification — no synthetic route drawn'
  if (status === 'verified') return 'Verified stage geometry available'
  return 'Reference reconstruction — organizer map + OpenStreetMap, not an official GPS trace'
}

export function RallyMap({ geometryStatus, geometry, run }: RallyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const simulationRef = useRef<HTMLSpanElement | null>(null)

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
      if (!geometry || !run) return

      const sourceData = buildStageGeoJson(geometry, geometry.coordinates[0], geometryStatus)

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
        id: 'simulated-vehicle',
        type: 'circle',
        source: 'stage-simulation',
        filter: ['==', ['get', 'kind'], 'simulated-vehicle'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#ff5d5d',
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
      const expectedDurationMs = run.expectedDurationSeconds * 1_000

      const animate = (realNowMs: number) => {
        const realElapsedMs = realNowMs - realStartMs
        const virtualElapsedMs = (realElapsedMs * run.playbackSpeed) % expectedDurationMs
        const snapshot = vehicleSnapshot(geometry, 0, expectedDurationMs, virtualElapsedMs)
        const source = map.getSource('stage-simulation') as GeoJSONSource | undefined

        source?.setData(buildStageGeoJson(geometry, snapshot.coordinate, geometryStatus))

        if (simulationRef.current) {
          simulationRef.current.textContent = `SIM CAR · ${run.playbackSpeed}× · ${(snapshot.progress * 100).toFixed(1)}%`
        }

        animationFrameId = requestAnimationFrame(animate)
      }

      animationFrameId = requestAnimationFrame(animate)
    })

    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
      map.remove()
    }
  }, [geometry, geometryStatus, run])

  return (
    <section className="map-panel" aria-label="Turquía rally stage simulation">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-status" role="status">
        <span className="status-dot" aria-hidden="true" />
        <span>{geometryMessage(geometryStatus, Boolean(geometry))}</span>
        {geometry && run ? <span ref={simulationRef}>SIM CAR · {run.playbackSpeed}× · 0.0%</span> : null}
      </div>
    </section>
  )
}
