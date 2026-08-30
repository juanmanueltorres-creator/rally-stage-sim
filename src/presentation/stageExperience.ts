import type { RallyScheduleStage } from '../domain/rally.ts'
import type { WeatherMode } from '../map/stageEnvironment.ts'
import type { StageWeatherSummary } from '../map/weatherSummary.ts'

export interface ScheduleDayGroup {
  date: string
  label: string
  stages: RallyScheduleStage[]
}

const DAY_LABELS: Record<string, string> = {
  '2026-09-11': 'VIERNES 11',
  '2026-09-12': 'SÁBADO 12',
  '2026-09-13': 'DOMINGO 13',
}

export function groupScheduleByDay(stages: RallyScheduleStage[]): ScheduleDayGroup[] {
  const groups = new Map<string, RallyScheduleStage[]>()

  stages
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .forEach((stage) => {
      const current = groups.get(stage.date) ?? []
      current.push(stage)
      groups.set(stage.date, current)
    })

  return Array.from(groups.entries()).map(([date, groupedStages]) => ({
    date,
    label: DAY_LABELS[date] ?? date,
    stages: groupedStages,
  }))
}

export function totalCompetitiveKm(stages: RallyScheduleStage[]): number {
  return Math.round(stages.reduce((total, stage) => total + stage.distanceKm, 0) * 100) / 100
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

export function describeStageConditions(
  summary: StageWeatherSummary,
  mode: WeatherMode | null = 'forecast',
): string[] {
  const messages: string[] = []
  const historical = mode === 'historical-reference'

  if (summary.maxPrecipitationMm !== null && summary.maxPrecipitationMm > 0) {
    messages.push(
      historical
        ? `Referencia histórica de precipitación: hasta ${roundOne(summary.maxPrecipitationMm)} mm en un nodo horario comparable.`
        : `Señal de precipitación presente en el recorrido: hasta ${roundOne(summary.maxPrecipitationMm)} mm en un nodo horario.`,
    )
  }

  if (summary.maxGustKmh !== null) {
    messages.push(
      historical
        ? `Referencia histórica de ráfagas de hasta ${roundOne(summary.maxGustKmh)} km/h.`
        : `Ráfagas modeladas de hasta ${roundOne(summary.maxGustKmh)} km/h.`,
    )
  }

  if (summary.temperatureMinC !== null && summary.temperatureMaxC !== null) {
    messages.push(
      historical
        ? `Referencia histórica: diferencia térmica de ${roundOne(summary.temperatureMaxC - summary.temperatureMinC)} °C entre nodos comparables.`
        : `Diferencia térmica modelada de ${roundOne(summary.temperatureMaxC - summary.temperatureMinC)} °C a lo largo del tramo.`,
    )
  }

  if (summary.elevationMinM !== null && summary.elevationMaxM !== null) {
    messages.push(
      `Desnivel de contexto de ${roundOne(summary.elevationMaxM - summary.elevationMinM)} m entre los nodos muestreados.`,
    )
  }

  if (messages.length > 0) return messages
  if (mode === null) return ['Contexto meteorológico no disponible.']
  if (historical) return ['Referencia histórica meteorológica no disponible para este tramo.']
  return ['Pronóstico de tramo pendiente o fuera del horizonte disponible.']
}
