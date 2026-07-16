import type { BriefFormData, VideoRow } from './types'

const MONDAY_API = 'https://api.monday.com/v2'

// Pipeline → Monday.com board ID mapping (set in Vercel env vars)
function getBoardId(pipeline?: string): string {
  const map: Record<string, string | undefined> = {
    'ORGANIC RETAINER':  process.env.MONDAY_ORGANIC_BOARD_ID,
    'PAID ADS RETAINER': process.env.MONDAY_PAID_BOARD_ID,
    'UGC PIPELINE':      process.env.MONDAY_UGC_BOARD_ID,
    'PROPERTY VIDEO':    process.env.MONDAY_PROPERTY_BOARD_ID,
  }
  return (pipeline && map[pipeline]) || process.env.MONDAY_ORGANIC_BOARD_ID || ''
}

export const MONDAY_STATUS_MAP: Record<string, string> = {
  'not-started': 'In Edit',
  'in-edit':     'In Edit',
  'amendments':  'Amendments',
  'in-review':   'In Review',
  'approved':    'Approved',
  'scheduled':   'Scheduled',
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.MONDAY_API_KEY!}`,
    'API-Version': '2023-10',
  }
}

async function gql(queryStr: string) {
  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query: queryStr }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Monday.com API ${res.status}: ${text}`)
  }
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

function buildColumnValues(overrides: Record<string, unknown> = {}): string {
  const vals: Record<string, unknown> = {}
  const statusCol  = process.env.MONDAY_STATUS_COL_ID
  const dateCol    = process.env.MONDAY_DATE_COL_ID
  const clientCol  = process.env.MONDAY_CLIENT_COL_ID
  if (statusCol) vals[statusCol] = overrides[statusCol] ?? { label: 'In Edit' }
  if (dateCol && overrides[dateCol]) vals[dateCol] = overrides[dateCol]
  if (clientCol && overrides[clientCol]) vals[clientCol] = overrides[clientCol]
  return JSON.stringify(vals)
}

function briefDescription(brief: BriefFormData): string {
  return [
    brief.assignedEditor      && `**Editor:** ${brief.assignedEditor}`,
    brief.platform            && `**Platform:** ${brief.platform}`,
    brief.funnelStage         && `**Funnel Stage:** ${brief.funnelStage}`,
    brief.whatWasFilmed       && `**What Was Filmed:** ${brief.whatWasFilmed}`,
    brief.locationVibe        && `**Location/Vibe:** ${brief.locationVibe}`,
    brief.shootObjective      && `**Shoot Objective:** ${brief.shootObjective}`,
    brief.generalInstructions && `**General Instructions:** ${brief.generalInstructions}`,
    brief.referenceLinks      && `**Reference Videos:** ${brief.referenceLinks}`,
  ].filter(Boolean).join('\n')
}

// Creates the parent brief item in Monday.com
export async function createMondayItem(brief: BriefFormData): Promise<{
  itemId: string
  itemUrl: string
  description: string
  boardId: string
}> {
  const boardId = getBoardId(brief.pipeline)
  if (!boardId) throw new Error('MONDAY_ORGANIC_BOARD_ID not configured')

  const itemName = `[${brief.client}] Brief — ${brief.shootDate}`
  const description = briefDescription(brief)

  const dateCol = process.env.MONDAY_DATE_COL_ID
  const clientCol = process.env.MONDAY_CLIENT_COL_ID
  const colVals = buildColumnValues({
    ...(dateCol && brief.shootDate ? { [dateCol]: { date: brief.shootDate } } : {}),
    ...(clientCol && brief.client  ? { [clientCol]: brief.client } : {}),
  })

  const groupClause = process.env.MONDAY_TODO_GROUP_ID
    ? `, group_id: ${JSON.stringify(process.env.MONDAY_TODO_GROUP_ID)}`
    : ''

  const data = await gql(`
    mutation {
      create_item(
        board_id: ${boardId}${groupClause},
        item_name: ${JSON.stringify(itemName)},
        column_values: ${JSON.stringify(colVals)}
      ) { id url }
    }
  `)

  return {
    itemId:      data.create_item.id as string,
    itemUrl:     data.create_item.url as string ?? `https://monday.com/boards/${boardId}`,
    description,
    boardId,
  }
}

// Adds brief URL + description as a comment on the item
export async function addBriefComment(itemId: string, briefUrl: string, description: string): Promise<void> {
  const body = `**Editor Brief:** ${briefUrl}\n\n${description}`
  await gql(`
    mutation {
      create_update(item_id: ${itemId}, body: ${JSON.stringify(body)}) { id }
    }
  `).catch(err => console.error('[monday] addBriefComment failed:', err))
}

// Creates one item per video — same naming as ClickUp subtasks
export async function createVideoItems(
  boardId: string,
  videos: VideoRow[],
  brief?: BriefFormData
): Promise<Record<string, string>> {
  const itemIds: Record<string, string> = {}
  const dateCol   = process.env.MONDAY_DATE_COL_ID
  const clientCol = process.env.MONDAY_CLIENT_COL_ID
  const groupClause = process.env.MONDAY_TODO_GROUP_ID
    ? `, group_id: ${JSON.stringify(process.env.MONDAY_TODO_GROUP_ID)}`
    : ''

  for (const v of videos) {
    const client = brief?.client ? `[${brief.client}] ` : ''
    const raw = v.hook || v.angleObjective || ''
    const label = raw.length > 60 ? raw.slice(0, 57).trimEnd() + '…' : raw
    const itemName = `${client}${label ? `${label} — ` : ''}${v.format || 'VIDEO'}${v.duration ? ` (${v.duration})` : ''}`

    const colVals = buildColumnValues({
      ...(dateCol && v.deadline   ? { [dateCol]: { date: v.deadline } } : {}),
      ...(clientCol && brief?.client ? { [clientCol]: brief.client } : {}),
    })

    const descLines = [
      brief?.shootDate           && `**Shoot Date:** ${brief.shootDate}`,
      brief?.assignedEditor      && `**Editor:** ${brief.assignedEditor}`,
      v.hook                     && `**Hook (first 3s):** ${v.hook}`,
      ...(v.aRollLinks ? v.aRollLinks.split('\n').filter(Boolean).map((l, i) => `**A-Roll${i > 0 ? ` ${i+1}` : ''}:** ${l}`) : []),
      ...(v.bRollLinks ? v.bRollLinks.split('\n').filter(Boolean).map((l, i) => `**B-Roll${i > 0 ? ` ${i+1}` : ''}:** ${l}`) : []),
      v.scriptLink               && `**Script:** ${v.scriptLink}`,
      v.musicLink                && `**Music:** ${v.musicLink}`,
      v.textOverlays             && `**Text Overlays:** ${v.textOverlays}`,
      v.specialNotes             && `**Special Notes:** ${v.specialNotes}`,
      brief?.whatWasFilmed       && `**Shoot Context:** ${brief.whatWasFilmed}`,
      brief?.generalInstructions && `**General Instructions:** ${brief.generalInstructions}`,
    ].filter(Boolean).join('\n')

    try {
      const data = await gql(`
        mutation {
          create_item(
            board_id: ${boardId}${groupClause},
            item_name: ${JSON.stringify(itemName)},
            column_values: ${JSON.stringify(colVals)}
          ) { id }
        }
      `)
      const itemId = data.create_item.id as string
      itemIds[v.id] = itemId

      if (descLines) {
        await gql(`
          mutation {
            create_update(item_id: ${itemId}, body: ${JSON.stringify(descLines)}) { id }
          }
        `).catch(console.error)
      }
    } catch (err) {
      console.error(`[monday] Failed to create item for video ${v.id}:`, err)
    }
  }

  return itemIds
}

// Updates a video item's status column
export async function updateMondayStatus(itemId: string, boardId: string, label: string): Promise<void> {
  const colId = process.env.MONDAY_STATUS_COL_ID
  if (!colId || !boardId) return
  try {
    await gql(`
      mutation {
        change_simple_column_value(
          board_id: ${boardId},
          item_id: ${itemId},
          column_id: ${JSON.stringify(colId)},
          value: ${JSON.stringify(label)}
        ) { id }
      }
    `)
  } catch (err) {
    console.error(`[monday] Status update failed for item ${itemId}:`, err)
  }
}

// Posts a comment when a brief is edited (shows updated content)
export async function addEditComment(itemId: string, brief: BriefFormData): Promise<void> {
  const desc = briefDescription(brief)
  const body = `**Brief updated**\n\n${desc}`
  await gql(`
    mutation {
      create_update(item_id: ${itemId}, body: ${JSON.stringify(body)}) { id }
    }
  `).catch(err => console.error('[monday] addEditComment failed:', err))
}

// Setup helper — returns boards + column info so you can find the right IDs
export async function discoverBoardStructure(boardId?: string) {
  if (boardId) {
    return gql(`
      query {
        boards(ids: [${boardId}]) {
          id name
          groups { id title }
          columns { id title type }
        }
      }
    `)
  }
  return gql(`
    query {
      boards(limit: 20) { id name }
    }
  `)
}
