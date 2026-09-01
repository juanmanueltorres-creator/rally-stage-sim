import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

interface SafetyTrainStep {
  id: string
  label: string
  offsetMinutes: number
}

interface SpectatorSnapshot {
  stageId: string
  accessStatus: 'known' | 'pending'
  roadClosureAt?: string
  exitRule?: string
  capacityNote?: string
  spectatorZones: unknown[]
  parking: unknown[]
  safetyTrain?: SafetyTrainStep[]
}

test('SS1 spectator snapshot exposes sourced operating rules while keeping exact access points pending', async () => {
  const raw = await readFile(new URL('../../public/data/chile-2026/spectator.json', import.meta.url), 'utf8')
  const snapshots = JSON.parse(raw) as SpectatorSnapshot[]
  const ss1 = snapshots.find((snapshot) => snapshot.stageId === 'chile-2026-ss1-turquia-1')

  assert.ok(ss1)
  assert.equal(ss1.accessStatus, 'pending')
  assert.equal(ss1.roadClosureAt, '2026-09-10T20:00:00-03:00')
  assert.match(ss1.exitRule ?? '', /sentido de la carrera/i)
  assert.match(ss1.exitRule ?? '', /Rastrillo/i)
  assert.match(ss1.capacityNote ?? '', /capacidad/i)
  assert.deepEqual(ss1.spectatorZones, [])
  assert.deepEqual(ss1.parking, [])
  assert.deepEqual(
    ss1.safetyTrain?.map((step) => step.offsetMinutes),
    [-110, -50, -35, -20, -10],
  )
})
