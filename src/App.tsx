import { useEffect, useState } from 'react'
import type {
  RallyEntry,
  RallyEvent,
  RallyScheduleStage,
  RallyStage,
  SimulatedStageRun,
  StageSpectatorInfo,
} from './domain/rally'
import { withTechnicalAvailability } from './domain/stageCatalog'
import { normalizeSpectatorInfo } from './domain/spectator'
import { parseAppRoute, type AppRoute } from './navigation/stageRoute'
import { hasSeenIntro, markIntroSeen } from './presentation/introPreference'
import { IntroOverlay } from './components/IntroOverlay'
import { RallyOverview } from './components/RallyOverview'
import { StageDetail } from './components/StageDetail'

interface AppData {
  event: RallyEvent
  technicalStages: RallyStage[]
  schedule: RallyScheduleStage[]
  runs: SimulatedStageRun[]
  entries: RallyEntry[]
  spectator: StageSpectatorInfo[]
}

function initialRoute(): AppRoute {
  if (typeof window === 'undefined') return { kind: 'overview' }
  return parseAppRoute(window.location.hash)
}

function initialIntroVisibility(): boolean {
  if (typeof window === 'undefined') return true
  return !hasSeenIntro(window.localStorage)
}

export function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [route, setRoute] = useState<AppRoute>(initialRoute)
  const [showIntro, setShowIntro] = useState(initialIntroVisibility)

  useEffect(() => {
    const handleHashChange = () => setRoute(parseAppRoute(window.location.hash))
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const base = import.meta.env.BASE_URL
        const [
          eventResponse,
          stagesResponse,
          fridayStagesResponse,
          scheduleResponse,
          simulationResponse,
          entriesResponse,
          spectatorResponse,
        ] = await Promise.all([
          fetch(`${base}data/chile-2026/event.json`),
          fetch(`${base}data/chile-2026/stages.json`),
          fetch(`${base}data/chile-2026/stages-friday.json`),
          fetch(`${base}data/chile-2026/schedule.json`),
          fetch(`${base}data/chile-2026/simulation.json`),
          fetch(`${base}data/chile-2026/entries.json`),
          fetch(`${base}data/chile-2026/spectator.json`),
        ])

        if (
          !eventResponse.ok ||
          !stagesResponse.ok ||
          !fridayStagesResponse.ok ||
          !scheduleResponse.ok ||
          !simulationResponse.ok ||
          !entriesResponse.ok ||
          !spectatorResponse.ok
        ) {
          throw new Error('No se pudo cargar el snapshot de Rally Chile 2026')
        }

        const technicalStages = [
          ...((await stagesResponse.json()) as RallyStage[]),
          ...((await fridayStagesResponse.json()) as RallyStage[]),
        ]
        const scheduleSnapshot = (await scheduleResponse.json()) as RallyScheduleStage[]

        const loaded: AppData = {
          event: (await eventResponse.json()) as RallyEvent,
          technicalStages,
          schedule: withTechnicalAvailability(scheduleSnapshot, technicalStages),
          runs: (await simulationResponse.json()) as SimulatedStageRun[],
          entries: (await entriesResponse.json()) as RallyEntry[],
          spectator: (await spectatorResponse.json()) as StageSpectatorInfo[],
        }

        if (!cancelled) setData(loaded)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Error de carga desconocido')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  function enterExperience() {
    markIntroSeen(typeof window !== 'undefined' ? window.localStorage : null)
    setShowIntro(false)
  }

  if (error) {
    return <main className="app-shell"><p className="load-error">{error}</p></main>
  }

  if (!data) {
    return <main className="app-shell"><p className="loading">Cargando Rally Chile 2026…</p></main>
  }

  const { event, technicalStages, schedule, runs, entries, spectator } = data
  let content

  if (route.kind === 'stage' && route.eventId === event.id) {
    const selected = schedule.find((stage) => stage.slug === route.stageSlug)

    if (selected) {
      const technicalStage = technicalStages.find((stage) => stage.code === selected.code) ?? null
      const run = technicalStage ? runs.find((candidate) => candidate.stageId === technicalStage.id) ?? null : null
      const spectatorStageId = technicalStage?.id ?? `${event.id}-${selected.code.toLowerCase()}`
      const specificSpectatorInfo = spectator.find((candidate) => candidate.stageId === spectatorStageId)
      const generalSpectatorInfo = spectator.find((candidate) => {
        const templateStage = technicalStages.find((stage) => stage.id === candidate.stageId)
        return templateStage?.date === selected.date && Boolean(candidate.roadClosureText || candidate.safetyTrain?.length)
      })
      const spectatorInfo = normalizeSpectatorInfo(
        specificSpectatorInfo,
        spectatorStageId,
        generalSpectatorInfo,
      )

      content = (
        <StageDetail
          event={event}
          stage={selected}
          technicalStage={technicalStage}
          run={run}
          entries={entries}
          spectator={spectatorInfo}
          onOpenIntro={() => setShowIntro(true)}
        />
      )
    } else {
      content = (
        <RallyOverview
          event={event}
          schedule={schedule}
          notice="Ese link de tramo todavía no existe en este snapshot"
          onOpenIntro={() => setShowIntro(true)}
        />
      )
    }
  } else {
    const notice = route.kind === 'overview'
      ? route.notice
      : route.kind === 'stage'
        ? 'El evento del link no coincide con Rally Chile 2026'
        : undefined

    content = (
      <RallyOverview
        event={event}
        schedule={schedule}
        notice={notice}
        onOpenIntro={() => setShowIntro(true)}
      />
    )
  }

  return (
    <>
      {content}
      {showIntro ? <IntroOverlay onEnter={enterExperience} /> : null}
    </>
  )
}
