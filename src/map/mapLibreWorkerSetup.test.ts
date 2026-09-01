import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const mainSource = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8')

test('Vite bundles MapLibre worker explicitly before React mounts', () => {
  assert.match(mainSource, /maplibre-gl-worker\.mjs\?worker&url/)
  assert.match(mainSource, /setWorkerUrl\(mapLibreWorkerUrl\)/)

  const workerSetupIndex = mainSource.indexOf('setWorkerUrl(mapLibreWorkerUrl)')
  const reactMountIndex = mainSource.indexOf('createRoot(')

  assert.ok(workerSetupIndex >= 0)
  assert.ok(reactMountIndex >= 0)
  assert.ok(workerSetupIndex < reactMountIndex)
})
