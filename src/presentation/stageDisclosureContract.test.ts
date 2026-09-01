import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../components/StageDisclosure.tsx', import.meta.url), 'utf8')

test('StageDisclosure exposes a button with explicit ARIA state and target', () => {
  assert.match(source, /type="button"/)
  assert.match(source, /aria-expanded=/)
  assert.match(source, /aria-controls=/)
  assert.match(source, /aria-hidden=/)
})
