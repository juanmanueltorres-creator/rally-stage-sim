import assert from 'node:assert/strict'
import test from 'node:test'
import { passRailPercent } from './passRail.ts'

test('passRailPercent maps first and second pass to opposite rail ends', () => {
  assert.equal(passRailPercent('SS1', 'SS1', 'SS4'), 0)
  assert.equal(passRailPercent('SS4', 'SS1', 'SS4'), 100)
})

test('passRailPercent fails closed to first pass for an unrelated code', () => {
  assert.equal(passRailPercent('SS9', 'SS1', 'SS4'), 0)
})
