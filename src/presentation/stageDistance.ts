export interface StageDistancePresentation {
  primary: string
  technical: string | null
}

export function presentStageDistance(
  scheduleDistanceKm: number,
  technicalDistanceKm: number | null | undefined,
): StageDistancePresentation {
  if (technicalDistanceKm === null || technicalDistanceKm === undefined) {
    return {
      primary: `${scheduleDistanceKm.toFixed(2)} km`,
      technical: null,
    }
  }

  if (Math.abs(scheduleDistanceKm - technicalDistanceKm) < 0.005) {
    return {
      primary: `${scheduleDistanceKm.toFixed(2)} km`,
      technical: null,
    }
  }

  return {
    primary: `${scheduleDistanceKm.toFixed(2)} km · schedule`,
    technical: `${technicalDistanceKm.toFixed(2)} km · WRC technical source`,
  }
}
