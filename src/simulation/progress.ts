export function stageProgress(elapsedSeconds: number, expectedDurationSeconds: number): number {
  if (!Number.isFinite(elapsedSeconds)) {
    throw new Error('elapsedSeconds must be finite')
  }

  if (!Number.isFinite(expectedDurationSeconds) || expectedDurationSeconds <= 0) {
    throw new Error('expectedDurationSeconds must be positive and finite')
  }

  return Math.min(1, Math.max(0, elapsedSeconds / expectedDurationSeconds))
}
