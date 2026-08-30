import type { StageSpectatorInfo } from './rally.ts'

export function normalizeSpectatorInfo(
  info: StageSpectatorInfo | undefined,
  stageId: string,
  generalInfo?: StageSpectatorInfo,
): StageSpectatorInfo {
  if (info) {
    return {
      ...info,
      accessPoints: info.accessPoints ?? [],
      noSpectatorZones: info.noSpectatorZones ?? [],
    }
  }

  if (generalInfo) {
    return {
      stageId,
      accessStatus: 'pending',
      roadClosureText: generalInfo.roadClosureText,
      roadClosureAt: generalInfo.roadClosureAt,
      exitRule: generalInfo.exitRule,
      capacityNote: generalInfo.capacityNote,
      spectatorZones: [],
      parking: [],
      accessPoints: [],
      noSpectatorZones: [],
      services: [],
      safetyTrain: generalInfo.safetyTrain,
      safetyNote: generalInfo.safetyNote,
      provenance: {
        state: 'planned',
        sources: generalInfo.provenance.sources,
        note: 'Inherited event-level operating and safety guidance. Stage-specific access points, spectator zones, parking, no-spectator areas and services remain pending official publication.',
      },
    }
  }

  return {
    stageId,
    accessStatus: 'pending',
    spectatorZones: [],
    parking: [],
    accessPoints: [],
    noSpectatorZones: [],
    services: [],
    provenance: {
      state: 'planned',
      sources: [],
      note: 'No stage-specific official spectator logistics loaded yet.',
    },
  }
}