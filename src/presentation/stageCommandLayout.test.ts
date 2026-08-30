import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../components/StageDetail.tsx', import.meta.url), 'utf8')

test('StageDetail keeps command bar before map and map before pass comparison', () => {
  const command = source.indexOf('<StageCommandBar')
  const map = source.indexOf('<RallyMap')
  const pass = source.indexOf('className="pass-comparison"')

  assert.ok(command >= 0)
  assert.ok(map > command)
  assert.ok(pass === -1 || pass > map)
})
