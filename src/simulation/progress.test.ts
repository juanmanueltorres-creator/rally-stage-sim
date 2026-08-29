import test from 'node:test'
import assert from 'node:assert/strict'

test('stageProgress normalizes elapsed time and clamps to 0..1', async () => {
  let module: typeof import('./progress.ts') | null = null

  try {
    module = await import('./progress.ts')
  } catch {
    // This makes the first RED run fail as an assertion when the module is absent.
  }

  assert.ok(module, 'progress module should exist')
  assert.equal(module.stageProgress(50, 100), 0.5)
  assert.equal(module.stageProgress(-10, 100), 0)
  assert.equal(module.stageProgress(120, 100), 1)
  assert.throws(() => module!.stageProgress(10, 0), /positive/)
})
