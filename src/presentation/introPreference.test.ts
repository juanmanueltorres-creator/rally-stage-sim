import assert from 'node:assert/strict'
import test from 'node:test'
import { hasSeenIntro, INTRO_SEEN_KEY, markIntroSeen, type StorageLike } from './introPreference.ts'

class MemoryStorage implements StorageLike {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

test('intro preference is unseen until the user enters the rally experience', () => {
  const storage = new MemoryStorage()
  assert.equal(hasSeenIntro(storage), false)
  markIntroSeen(storage)
  assert.equal(storage.getItem(INTRO_SEEN_KEY), '1')
  assert.equal(hasSeenIntro(storage), true)
})

test('intro preference fails open when browser storage is unavailable', () => {
  const broken: StorageLike = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
  }

  assert.equal(hasSeenIntro(broken), false)
  assert.doesNotThrow(() => markIntroSeen(broken))
})
