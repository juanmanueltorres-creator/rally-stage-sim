import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import type { RallyStage } from './rally.ts'

async function loadStages(): Promise<RallyStage[]> {
  const [baseRaw, fridayRaw] = await Promise.all([
    readFile(new URL('../../public/data/chile-2026/stages.json', import.meta.url), 'utf8'),
    readFile(new URL('../../public/data/chile-2026/stages-friday.json', import.meta.url), 'utf8'),
  ])

  return [
    ...(JSON.parse(baseRaw) as RallyStage[]),
    ...(JSON.parse(fridayRaw) as RallyStage[]),
  ]
}

function geometryLengthKm(coordinates: [number, number][]): number {
  const earthRadiusKm = 6371.0088
  let total = 0

  for (let index = 1; index < coordinates.length; index += 1) {
    const [lon1, lat1] = coordinates[index - 1]
    const [lon2, lat2] = coordinates[index]
    const lat1Rad = lat1 * Math.PI / 180
    const lat2Rad = lat2 * Math.PI / 180
    const deltaLat = (lat2 - lat1) * Math.PI / 180
    const deltaLon = (lon2 - lon1) * Math.PI / 180
    const haversine =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) ** 2

    total += 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine))
  }

  return total
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

test('Nuevo Rere and Hualqui use dense current-route reference geometry rather than nine-point corridor sketches', async () => {
  const stages = await loadStages()
  const friday = stages.filter((stage) => stage.code === 'SS2' || stage.code === 'SS3')

  assert.equal(friday.length, 2)
  for (const stage of friday) {
    assert.ok((stage.geometry?.coordinates.length ?? 0) >= 50, `${stage.code} should contain a dense route geometry`)
    assert.ok(stage.provenance.sources.some((source) => source.url.includes('rally-maps.com')), `${stage.code} should cite the current interactive route reference`)
    assert.match(stage.provenance.note ?? '', /reference reconstruction/i)
    assert.doesNotMatch(stage.provenance.note ?? '', /coarse corridor reconstruction/i)
  }
})

test('dense Friday reference geometries stay within one percent of WRC technical distance', async () => {
  const stages = await loadStages()
  const friday = stages.filter((stage) => stage.code === 'SS2' || stage.code === 'SS3')

  for (const stage of friday) {
    assert.ok(stage.geometry, `${stage.code} should have geometry`)
    const geometryKm = geometryLengthKm(stage.geometry.coordinates as [number, number][])
    const relativeError = Math.abs(geometryKm - stage.distanceKm) / stage.distanceKm

    assert.ok(
      relativeError < 0.01,
      `${stage.code} geometry ${geometryKm.toFixed(3)} km should stay within 1% of ${stage.distanceKm.toFixed(2)} km`,
    )
  }
})
