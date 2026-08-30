import assert from 'node:assert/strict'
import test from 'node:test'
import { motionDuration, prefersReducedMotion } from './uiMotion.ts'

test('motionDuration becomes zero for reduced motion', () => {
  assert.equal(motionDuration(true, 0.22), 0)
  assert.equal(motionDuration(false, 0.22), 0.22)
})

test('prefersReducedMotion accepts injected matchMedia', () => {
  assert.equal(prefersReducedMotion(() => ({ matches: true })), true)
  assert.equal(prefersReducedMotion(() => ({ matches: false })), false)
})
