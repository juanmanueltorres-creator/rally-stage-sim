import type { StageSpectatorInfo } from './rally.ts'

export function normalizeSpectatorInfo(
  info: StageSpectatorInfo | undefined,
  stageId: string,
): StageSpectatorInfo {
  if (info) return info

  return {
    stageId,
    accessStatus: 'pending',
    spectatorZones: [],
    parking: [],
    services: [],
    provenance: {
      state: 'planned',
      sources: [],
      note: 'No stage-specific official spectator logistics loaded yet.',
    },
  }
}
