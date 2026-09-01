import assert from 'node:assert/strict'
import test from 'node:test'
import { describeGeometryStatus } from './geometryStatus.ts'

test('reconstructed geometry message does not imply one reconstruction method for every stage', () => {
  const message = describeGeometryStatus('reconstructed', true)

  assert.match(message, /Reconstrucción de referencia/i)
  assert.match(message, /no GPS oficial/i)
  assert.doesNotMatch(message, /OpenStreetMap/i)
})

test('missing geometry remains explicit', () => {
  assert.match(describeGeometryStatus('pending-verification', false), /pendiente de verificación/i)
})
