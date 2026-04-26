import type { CLIENTS, PLATFORMS, VIDEO_FORMATS, FUNNEL_STAGES, PIPELINES } from './constants'

export type Client = typeof CLIENTS[number]
export type Pipeline = (typeof PIPELINES)[number]
export type Platform = typeof PLATFORMS[number]
export type VideoFormat = typeof VIDEO_FORMATS[number]
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export interface VideoRow {
  id: string
  format: VideoFormat | ''
  duration: string
  angleObjective: string
  hook: string
  aRollLinks: string   // newline-separated URLs
  bRollLinks: string   // newline-separated URLs
  scriptLink: string
  musicLink: string
  textOverlays: string
  specialNotes: string
  deadline: string
}

export interface BriefFormData {
  // Pipeline
  pipeline: Pipeline | ''

  // Header
  client: Client | ''
  shootDate: string
  briefFilledBy: string
  dateSent: string

  // Shoot context
  whatWasFilmed: string
  locationVibe: string
  shootObjective: string

  // Funnel
  funnelStage: FunnelStage | ''

  // Platform
  platform: Platform | ''

  // Videos
  videos: VideoRow[]

  // Client brief link
  clientBriefLink: string

  // Reference videos
  referenceLinks: string

  // General instructions
  generalInstructions: string

  // Assigned editor
  assignedEditor: string
}

export type BriefStatus = 'not-started' | 'in-edit' | 'amendments' | 'in-review' | 'approved' | 'scheduled'

export interface ClientProfile {
  musicStyle: string
  editingPace: string
  colourCodes: string
  captionFont: string
  captionFontImageUrl: string
  overlayFont: string
  overlayFontImageUrl: string
  logoUrl: string
  dos: string[]
  donts: string[]
  generalNotes: string
}

export interface StoredBrief {
  brief: BriefFormData
  taskId: string
  taskUrl: string
  briefUrl: string
  submittedAt: string
  updatedAt?: string
  // per-video statuses keyed by video.id
  videoStatuses: Record<string, BriefStatus>
  // ClickUp subtask IDs keyed by video.id
  videoSubtaskIds: Record<string, string>
  // final asset links submitted by editor, keyed by video.id
  videoAssetUrls?: Record<string, string>
  // timestamp when each video was set to approved, keyed by video.id
  videoApprovedAt?: Record<string, string>
  // snapshot of client style guide at submission time
  clientProfile: ClientProfile | null
}

export interface SubmitBriefPayload {
  brief: BriefFormData
}

export interface SubmitBriefResponse {
  success: boolean
  taskId?: string
  taskUrl?: string
  briefUrl?: string
  error?: string
}
