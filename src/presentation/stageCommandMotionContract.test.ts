import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../stageCommandView.css', import.meta.url), 'utf8')

test('Stage Command View contains a reduced-motion fallback', () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})
