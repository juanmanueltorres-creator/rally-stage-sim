type MatchMediaLike = (query: string) => { matches: boolean }

export function prefersReducedMotion(matchMediaOverride?: MatchMediaLike): boolean {
  if (matchMediaOverride) return matchMediaOverride('(prefers-reduced-motion: reduce)').matches
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function motionDuration(reduced: boolean, normalSeconds: number): number {
  return reduced ? 0 : normalSeconds
}
