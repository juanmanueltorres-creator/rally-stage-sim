import type { DataSource, RallyScheduleStage, RallyStage, StageRouteReuse } from './rally.ts'

function mergeSources(...sourceGroups: DataSource[][]): DataSource[] {
  const byUrl = new Map<string, DataSource>()

  for (const source of sourceGroups.flat()) {
    byUrl.set(source.url, source)
  }

  return [...byUrl.values()]
}

export interface RouteReusePair {
  firstPassCode: string
  secondPassCode: string
}

export function findRouteReusePair(
  stageCode: string,
  routeReuse: StageRouteReuse[],
): RouteReusePair | null {
  const mapping = routeReuse.find(
    (candidate) => candidate.stageCode === stageCode || candidate.sourceStageCode === stageCode,
  )

  return mapping
    ? { firstPassCode: mapping.sourceStageCode, secondPassCode: mapping.stageCode }
    : null
}

export function materializeTechnicalStages(
  schedule: RallyScheduleStage[],
  technicalStages: RallyStage[],
  routeReuse: StageRouteReuse[],
): RallyStage[] {
  const result = [...technicalStages]

  for (const mapping of routeReuse) {
    if (result.some((stage) => stage.code === mapping.stageCode)) continue

    const target = schedule.find((stage) => stage.code === mapping.stageCode)
    const source = result.find((stage) => stage.code === mapping.sourceStageCode)

    if (!target) {
      throw new Error(`Cannot materialize ${mapping.stageCode}: schedule stage is missing`)
    }

    if (!source?.geometry) {
      throw new Error(`Cannot materialize ${mapping.stageCode}: source ${mapping.sourceStageCode} has no geometry`)
    }

    result.push({
      ...source,
      id: `${target.eventId}-${target.slug}`,
      eventId: target.eventId,
      sequence: target.sequence,
      code: target.code,
      name: target.name,
      date: target.date,
      scheduledStart: target.scheduledStart,
      // Technical distance follows the reused route source. The schedule snapshot remains independent.
      distanceKm: source.distanceKm,
      geometry: source.geometry,
      provenance: {
        state: 'planned',
        sources: mergeSources(source.provenance.sources, mapping.provenance.sources),
        note: [
          source.provenance.note,
          mapping.provenance.note,
          `Geometry reused from ${source.code} for ${target.code}; the repeated pass keeps its own scheduled start time.`,
        ].filter(Boolean).join(' '),
      },
    })
  }

  return result.sort((a, b) => a.sequence - b.sequence)
}

export function withTechnicalAvailability(
  schedule: RallyScheduleStage[],
  technicalStages: Pick<RallyStage, 'code' | 'geometry'>[],
): RallyScheduleStage[] {
  const availableCodes = new Set(
    technicalStages
      .filter((stage) => stage.geometry !== null)
      .map((stage) => stage.code),
  )

  return schedule.map((stage) => ({
    ...stage,
    interactive: availableCodes.has(stage.code),
  }))
}
