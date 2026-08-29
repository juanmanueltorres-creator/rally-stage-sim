import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import type { StageGeometryStatus } from '../domain/rally'

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
}

interface RallyMapProps {
  geometryStatus: StageGeometryStatus
}

export function RallyMap({ geometryStatus }: RallyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-73.05, -36.82],
      zoom: 7,
      attributionControl: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    return () => map.remove()
  }, [])

  return (
    <section className="map-panel" aria-label="Biobío rally map context">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-status" role="status">
        <span className="status-dot" aria-hidden="true" />
        {geometryStatus === 'verified'
          ? 'Verified stage geometry available'
          : 'Route geometry pending verification — no synthetic route drawn'}
      </div>
    </section>
  )
}
