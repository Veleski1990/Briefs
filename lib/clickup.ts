import type { BriefFormData, VideoRow } from './types'
import {
  CLICKUP_LIST_ID,
  PIPELINE_LIST_IDS,
  CLICKUP_FIELD_IDS,
  CLIENT_OPTION_IDS,
  PLATFORM_OPTION_IDS,
  TYPE_OPTION_IDS,
} from './constants'

const CLICKUP_API = 'https://api.clickup.com/api/v2'

function getAuthHeaders() {
  return {
    Authorization: process.env.CLICKUP_API_KEY!,
    'Content-Type': 'application/json',
  }
}

function line(label: string, value: string | undefined): string {
  return value?.trim() ? `**${label}:** ${value.trim()}` : ''
}

function videoBlock(v: VideoRow, i: number): string {
  const header = `### Video ${i + 1} — ${v.format || 'TBD'}${v.duration ? ` (${v.duration})` : ''}${v.deadline ? ` · Due ${v.deadline}` : ''}`
  const fields = [
    line('Angle / Objective', v.angleObjective),
    line('Hook (first 3s)', v.hook),
    v.aRollLinks ? v.aRollLinks.split('\n').filter(Boolean).map((l, i) => line(`A-Roll${i > 0 ? ` ${i + 1}` : ''}`, l)).join('\n') : line('A-Roll', ''),
    v.bRollLinks ? v.bRollLinks.split('\n').filter(Boolean).map((l, i) => line(`B-Roll${i > 0 ? ` ${i + 1}` : ''}`, l)).join('\n') : line('B-Roll', ''),
    line('Script', v.scriptLink),
    line('Music', v.musicLink),
    line('Text Overlays', v.textOverlays),
    line('Special Notes', v.specialNotes),
  ].filter(Boolean)
  return [header, ...fields].join('\n')
}

export function buildUpdatedDescription(brief: BriefFormData): string {
  return buildTaskDescription(brief)
}

function buildTaskDescription(brief: BriefFormData): string {
  const sections: string[] = []

  // Overview — only non-empty fields
  const overview = [
    line('Client', brief.client),
    line('Pipeline', brief.pipeline),
    line('Platform', brief.platform),
    line('Funnel Stage', brief.funnelStage),
    line('Shoot Date', brief.shootDate),
    line('Sent', brief.dateSent),
    line('Filled By', brief.briefFilledBy),
    line('Assigned Editor', brief.assignedEditor),
    line('Client Brief', brief.clientBriefLink),
  ].filter(Boolean).join('\n')
  if (overview) sections.push(`## Overview\n\n${overview}`)

  // Shoot context
  const context = [
    line('What Was Filmed', brief.whatWasFilmed),
    line('Location / Vibe', brief.locationVibe),
    line('Shoot Objective', brief.shootObjective),
  ].filter(Boolean).join('\n')
  if (context) sections.push(`## Shoot Context\n\n${context}`)

  // Videos
  if (brief.videos.length > 0) {
    const videoBlocks = brief.videos.map(videoBlock).join('\n\n')
    sections.push(`## Videos (${brief.videos.length})\n\n${videoBlocks}`)
  }

  // Reference videos
  if (brief.referenceLinks?.trim()) {
    sections.push(`## Reference Videos\n\n${brief.referenceLinks.trim()}`)
  }

  // General instructions
  if (brief.generalInstructions?.trim()) {
    sections.push(`## General Instructions\n\n${brief.generalInstructions.trim()}`)
  }

  return sections.join('\n\n---\n\n')
}

function buildCustomFields(brief: BriefFormData): object[] {
  const fields: object[] = []

  // CLIENT dropdown — use option ID
  const clientOptionId = brief.client ? CLIENT_OPTION_IDS[brief.client] : null
  if (CLICKUP_FIELD_IDS.CLIENT && clientOptionId) {
    fields.push({ id: CLICKUP_FIELD_IDS.CLIENT, value: clientOptionId })
  }

  // PLATFORM dropdown — use option ID
  const platformOptionId = brief.platform ? PLATFORM_OPTION_IDS[brief.platform] : null
  if (CLICKUP_FIELD_IDS.PLATFORM && platformOptionId) {
    fields.push({ id: CLICKUP_FIELD_IDS.PLATFORM, value: platformOptionId })
  }

  // TYPE — use the first video's format if it maps to a known option ID
  const firstFormat = brief.videos[0]?.format
  const typeOptionId = firstFormat ? TYPE_OPTION_IDS[firstFormat] : null
  if (CLICKUP_FIELD_IDS.TYPE && typeOptionId) {
    fields.push({ id: CLICKUP_FIELD_IDS.TYPE, value: typeOptionId })
  }

  // FUNNEL_STAGE — once field is created in ClickUp, add option IDs similarly
  // EDITOR_BRIEF URL field — once created

  return fields
}

export async function createClickUpTask(brief: BriefFormData) {
  const taskName = `[${brief.client}] Editor Brief — ${brief.shootDate}`
  const description = buildTaskDescription(brief)
  const customFields = buildCustomFields(brief)

  const listId = (brief.pipeline && PIPELINE_LIST_IDS[brief.pipeline]) || CLICKUP_LIST_ID

  const body: Record<string, unknown> = {
    name: taskName,
    description,
    markdown_description: description,
    status: 'in edit',
    priority: 3, // Normal
  }

  if (customFields.length > 0) {
    body.custom_fields = customFields
  }

  const response = await fetch(`${CLICKUP_API}/list/${listId}/task`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ClickUp API error ${response.status}: ${error}`)
  }

  const task = await response.json()
  return {
    taskId: task.id as string,
    taskUrl: task.url as string,
    description,
  }
}

// Creates one subtask per video under the parent task.
// Returns a map of videoId → subtask ClickUp task ID.
export async function createVideoSubtasks(
  parentTaskId: string,
  listId: string,
  videos: VideoRow[]
): Promise<Record<string, string>> {
  const subtaskIds: Record<string, string> = {}

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i]
    const name = `Video ${i + 1} — ${v.format || 'TBD'}${v.duration ? ` (${v.duration})` : ''}`
    const lines = [
      v.angleObjective && `**Angle / Objective:** ${v.angleObjective}`,
      v.hook && `**Hook (first 3s):** ${v.hook}`,
      ...(v.aRollLinks ? v.aRollLinks.split('\n').filter(Boolean).map((l, i) => `**A-Roll${i > 0 ? ` ${i + 1}` : ''}:** ${l}`) : []),
      ...(v.bRollLinks ? v.bRollLinks.split('\n').filter(Boolean).map((l, i) => `**B-Roll${i > 0 ? ` ${i + 1}` : ''}:** ${l}`) : []),
      v.scriptLink && `**Script:** ${v.scriptLink}`,
      v.musicLink && `**Music:** ${v.musicLink}`,
      v.textOverlays && `**Text Overlays:** ${v.textOverlays}`,
      v.specialNotes && `**Special Notes:** ${v.specialNotes}`,
    ].filter(Boolean).join('\n')

    const body: Record<string, unknown> = {
      name,
      parent: parentTaskId,
      status: 'in edit',
      priority: 3,
    }
    if (lines) {
      body.description = lines
      body.markdown_description = lines
    }
    if (v.deadline) {
      // ClickUp expects due_date as milliseconds timestamp
      body.due_date = new Date(v.deadline).getTime()
      body.due_date_time = false
    }

    try {
      const res = await fetch(`${CLICKUP_API}/list/${listId}/task`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const subtask = await res.json()
        subtaskIds[v.id] = subtask.id as string
      } else {
        const err = await res.text()
        console.error(`[clickup] Failed to create subtask for ${v.id}: ${err}`)
      }
    } catch (err) {
      console.error(`[clickup] Subtask creation error for ${v.id}:`, err)
    }
  }

  return subtaskIds
}

export async function updateSubtaskStatus(subtaskId: string, status: string) {
  const res = await fetch(`${CLICKUP_API}/task/${subtaskId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    console.error(`[clickup] Failed to update subtask ${subtaskId} status`)
  }
}

export async function patchTaskBriefUrl(taskId: string, existingDescription: string, briefUrl: string) {
  const updated = `## Editor Brief Link\n\n[Open Brief →](${briefUrl})\n\n---\n\n${existingDescription}`
  const response = await fetch(`${CLICKUP_API}/task/${taskId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      description: updated,
      markdown_description: updated,
    }),
  })
  if (!response.ok) {
    const error = await response.text()
    console.error(`[clickup] Failed to patch brief URL onto task: ${error}`)
    // Non-fatal — task was already created successfully
  }
}

// Utility: fetch all custom fields for the list (useful for setup/debugging)
export async function getListCustomFields() {
  const response = await fetch(`${CLICKUP_API}/list/${CLICKUP_LIST_ID}/field`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) throw new Error(`Failed to fetch fields: ${response.status}`)
  return response.json()
}
