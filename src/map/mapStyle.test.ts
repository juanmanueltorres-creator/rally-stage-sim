import assert from 'node:assert/strict'
import test from 'node:test'
import { MAP_STYLE } from './mapStyle.ts'

test('MAP_STYLE includes a real basemap source and visible attribution instead of background-only styling', () => {
  const source = MAP_STYLE.sources.basemap

  assert.ok(source)
  assert.equal(source.type, 'raster')
  assert.deepEqual(source.tiles, ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'])
  assert.match(source.attribution ?? '', /OpenStreetMap/)
  assert.ok(MAP_STYLE.layers.some((layer) => layer.id === 'basemap'))
})
