export type DataState = 'planned' | 'simulated' | 'observed'

export type StageGeometryStatus = 'pending-verification' | 'reconstructed' | 'verified'

export interface DataSource {
  label: string
  url: string
  accessedAt: string
}

export interface DataProvenance {
  state: DataState
  sources: DataSource[]
  note?: string
}

export interface StageLineString {
  type: 'LineString'
  coordinates: [number, number][]
}

export interface RallyEvent {
  id: string
  name: string
  country: string
  region: string
  startDate: string
  endDate: string
  timezone: string
  provenance: DataProvenance
}

export interface RallyStage {
  id: string
  eventId: string
  sequence: number
  code: string
  name: string
  date: string
  scheduledStart: string
  distanceKm: number
  surface: 'gravel' | 'tarmac' | 'mixed' | 'unknown'
  geometryStatus: StageGeometryStatus
  geometry: StageLineString | null
  provenance: DataProvenance
}

export interface RallyScheduleStage {
  eventId: string
  sequence: number
  code: string
  slug: string
  name: string
  date: string
  scheduledStart: string
  distanceKm: number
  interactive: boolean
  provenance: DataProvenance
}

export interface RallyEntry {
  carNo: number
  driver: string
  coDriver: string
  entrant: string
  car: string
  class: string
  priority: string
  provenance: DataProvenance
}

export interface SimulatedStageRun {
  stageId: string
  priority: string
  carCount: number
  startIntervalSeconds: number
  expectedDurationSeconds: number
  playbackSpeed: number
  provenance: DataProvenance
}

export interface SpectatorPoint {
  id: string
  label: string
  coordinate?: [number, number]
  description?: string
}

export interface SpectatorService {
  id: string
  label: string
  kind: 'parking' | 'toilets' | 'food' | 'shuttle' | 'other'
  description?: string
}

export interface StageSpectatorInfo {
  stageId: string
  accessStatus: 'known' | 'pending'
  roadClosureText?: string
  spectatorZones: SpectatorPoint[]
  parking: SpectatorPoint[]
  services: SpectatorService[]
  safetyNote?: string
  provenance: DataProvenance
}
