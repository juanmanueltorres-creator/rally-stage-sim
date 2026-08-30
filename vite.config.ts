import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // MapLibre v6 workers can fail when Vite pre-bundles the package,
    // leaving GeoJSON-backed route and vehicle layers invisible at runtime.
    exclude: ['maplibre-gl'],
  },
})
