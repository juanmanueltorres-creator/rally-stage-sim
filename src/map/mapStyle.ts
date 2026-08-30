import type { StyleSpecification } from 'maplibre-gl'

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#071017',
      },
    },
    {
      id: 'basemap',
      type: 'raster',
      source: 'basemap',
      minzoom: 0,
      maxzoom: 19,
      paint: {
        'raster-opacity': 0.82,
        'raster-saturation': -0.72,
        'raster-contrast': 0.18,
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.58,
      },
    },
  ],
}
