export const INTRO_SEEN_KEY = 'rally-stage-intelligence:intro-seen'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function hasSeenIntro(storage: StorageLike | null | undefined): boolean {
  if (!storage) return false
  try {
    return storage.getItem(INTRO_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markIntroSeen(storage: StorageLike | null | undefined): void {
  if (!storage) return
  try {
    storage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    // Storage can be blocked by privacy settings. The application remains usable.
  }
}
