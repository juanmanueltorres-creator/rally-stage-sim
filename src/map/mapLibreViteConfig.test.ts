import assert from 'node:assert/strict'
import test from 'node:test'
import viteConfig from '../../vite.config.ts'

test('Vite excludes MapLibre from dependency pre-bundling so GeoJSON worker layers render', () => {
  assert.equal(typeof viteConfig, 'object')
  assert.ok(viteConfig && 'optimizeDeps' in viteConfig)

  const optimizeDeps = viteConfig.optimizeDeps as { exclude?: string[] } | undefined
  assert.ok(optimizeDeps?.exclude?.includes('maplibre-gl'))
})
