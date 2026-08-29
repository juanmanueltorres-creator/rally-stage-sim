import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import type { RallyStage } from './rally.ts'

async function loadStages(): Promise<RallyStage[]> {
  const raw = await readFile(new URL('../../public/data/chile-2026/stages.json', import.meta.url), 'utf8')
  return JSON.parse(raw) as RallyStage[]
}

test('technical stage snapshot contains reconstructed geometry for SS1 through SS3', async () => {
  const stages = await loadStages()

  assert.deepEqual(stages.map((stage) => stage.code), ['SS1', 'SS2', 'SS3'])

  for (const stage of stages) {
    assert.equal(stage.geometryStatus, 'reconstructed')
    assert.equal(stage.geometry?.type, 'LineString')
    assert.ok((stage.geometry?.coordinates.length ?? 0) >= 8)
    assert.ok(stage.provenance.sources.length >= 2)
  }
})

test('Nuevo Rere and Hualqui keep official WRC technical distances separate from schedule discrepancies', async () => {
  const stages = await loadStages()
  const nuevoRere = stages.find((stage) => stage.code === 'SS2')
  const hualqui = stages.find((stage) => stage.code === 'SS3')

  assert.equal(nuevoRere?.distanceKm, 10.76)
  assert.equal(hualqui?.distanceKm, 16.69)
  assert.match(nuevoRere?.provenance.note ?? '', /new start/i)
  assert.match(hualqui?.provenance.note ?? '', /reversed/i)
})
