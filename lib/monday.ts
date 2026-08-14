import type { BriefFormData, VideoRow } from './types'

const MONDAY_API = 'https://api.monday.com/v2'

// Pipeline → Monday.com board ID mapping. Env vars still win if set;
// otherwise we auto-discover a board whose name matches the pipeline keyword.
const PIPELINE_ENV: Record<string, string | undefined> = {
  'ORGANIC RETAINER':  process.env.MONDAY_ORGANIC_BOARD_ID,
  'PAID ADS RETAINER': process.env.MONDAY_PAID_BOARD_ID,
  'UGC PIPELINE':      process.env.MONDAY_UGC_BOARD_ID,
  'PROPERTY VIDEO':    process.env.MONDAY_PROPERTY_BOARD_ID,
}
const PIPELINE_KEYWORD: Record<string, RegExp> = {
  'ORGANIC RETAINER':  /organic/i,
  'PAID ADS RETAINER': /paid/i,
  'UGC PIPELINE':      /ugc/i,
  'PROPERTY VIDEO':    /property|real\s*estate/i,
}
const boardIdCache = new Map<string, string>()

export async function resolveBoardId(pipeline?: string): Promise<string> {
  const key = pipeline ?? ''
  const envValue = PIPELINE_ENV[key]
  if (envValue) return envValue
  if (boardIdCache.has(key)) return boardIdCache.get(key)!
  const keyword = PIPELINE_KEYWORD[key]
  if (!keyword) {
    return process.env.MONDAY_ORGANIC_BOARD_ID || ''
  }
  try {
    const data = await gql(`query { boards(limit: 100) { id name state } }`)
    const boards: Array<{ id: string; name: string; state: string }> = data.boards ?? []
    const match = boards.find(b => b.state === 'active' && keyword.test(b.name))
    if (!match) {
      console.warn(`[monday] resolveBoardId: no active board matched keyword ${keyword} for pipeline "${pipeline}". Set MONDAY_PAID_BOARD_ID etc. or rename the board.`)
      return process.env.MONDAY_ORGANIC_BOARD_ID || ''
    }
    boardIdCache.set(key, match.id)
    return match.id
  } catch (err) {
    console.error('[monday] resolveBoardId failed:', err)
    return process.env.MONDAY_ORGANIC_BOARD_ID || ''
  }
}

// Kept for any legacy synchronous callers — prefer resolveBoardId.
export function getBoardId(pipeline?: string): string {
  return (pipeline && PIPELINE_ENV[pipeline]) || process.env.MONDAY_ORGANIC_BOARD_ID || ''
}

export const MONDAY_STATUS_MAP: Record<string, string> = {
  'not-started': 'Editing',
  'in-edit':     'Editing',
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
  return JSON.stringify(overrides)
}

// Converts YYYY-MM (e.g. "2026-08") to "August 2026" for group name matching
function monthGroupName(yyyyMm: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(yyyyMm)
  if (!match) return ''
  const year = Number(match[1])
  const monthIdx = Number(match[2]) - 1
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  if (monthIdx < 0 || monthIdx > 11) return ''
  return `${months[monthIdx]} ${year}`
}

// Finds a group by name in the given board, auto-creating it if missing.
// If publicationMonth is invalid, falls back to MONDAY_TODO_GROUP_ID (legacy)
// or empty string (let Monday drop it in the first group by default).
export async function findMonthGroupId(boardId: string, publicationMonth: string): Promise<string> {
  const fallback = process.env.MONDAY_TODO_GROUP_ID || ''
  const target = monthGroupName(publicationMonth)
  const targetLower = target.toLowerCase().trim()
  if (!target || !boardId) return fallback

  try {
    const data = await gql(`
      query {
        boards(ids: [${boardId}]) {
          groups { id title }
        }
      }
    `)
    const groups: Array<{ id: string; title: string }> = data.boards?.[0]?.groups ?? []
    const match = groups.find(g => g.title.toLowerCase().trim() === targetLower)
    if (match) return match.id

    // Auto-create the month group at the top of the board
    const created = await gql(`
      mutation {
        create_group(
          board_id: ${boardId},
          group_name: ${JSON.stringify(target)}
        ) { id }
      }
    `)
    return created.create_group?.id ?? fallback
  } catch (err) {
    console.error('[monday] findMonthGroupId failed:', err)
    return fallback
  }
}

// Looks up a Monday.com workspace user by name (case-insensitive).
// Matches exact full name, first name, email prefix, or as a fallback,
// any user whose name/email contains the target string.
export async function findMondayUserId(name: string): Promise<number | null> {
  if (!name || name.toLowerCase() === 'other') return null
  try {
    const data = await gql(`query { users(limit: 200) { id name email } }`)
    const users: Array<{ id: string; name: string; email: string }> = data.users ?? []
    const target = name.toLowerCase().trim()
    const match =
      users.find(u =>
        u.name.toLowerCase().trim() === target ||
        u.name.toLowerCase().split(' ')[0] === target ||
        u.email?.toLowerCase().split('@')[0] === target
      ) ??
      users.find(u =>
        u.name.toLowerCase().includes(target) ||
        u.email?.toLowerCase().includes(target)
      )
    if (!match) {
      console.warn(`[monday] findMondayUserId: no user matched "${name}". Checked ${users.length} users. Add them to monday.com or update TEAM_MEMBERS to match an existing name.`)
    }
    return match ? Number(match.id) : null
  } catch (err) {
    console.error('[monday] findMondayUserId failed:', err)
    return null
  }
}

// Looks up a client's item ID in the Client Hub (TEAM) board by name
export async function findClientHubItemId(clientName: string): Promise<string | null> {
  const hubBoardId = process.env.MONDAY_CLIENT_HUB_BOARD_ID
  if (!hubBoardId || !clientName) return null

  try {
    const data = await gql(`
      query {
        boards(ids: [${hubBoardId}]) {
          items_page(limit: 200) {
            items { id name }
          }
        }
      }
    `)
    const items = data.boards?.[0]?.items_page?.items ?? []
    const target = clientName.toLowerCase().trim()
    const match = items.find((it: { id: string; name: string }) =>
      it.name.toLowerCase().trim() === target
    )
    return match?.id ?? null
  } catch (err) {
    console.error('[monday] findClientHubItemId failed:', err)
    return null
  }
}

function briefDescription(brief: BriefFormData): string {
  return [
    brief.assignedEditor      && `**Editor:** ${brief.assignedEditor}`,
    brief.platform            && `**Platform:** ${brief.platform}`,
    brief.funnelStage         && `**Funnel Stage:** ${brief.funnelStage}`,
    brief.generalInstructions && `**General Instructions:** ${brief.generalInstructions}`,
    brief.referenceLinks      && `**Reference Videos:** ${brief.referenceLinks}`,
  ].filter(Boolean).join('\n')
}

// If the Client connect column rejects the linked item (usually because the
// pipeline board's Connect Boards column points at a different board than
// MONDAY_CLIENT_HUB_BOARD_ID), we retry without the client link so submission
// still succeeds. Fix on monday.com side: reconfigure the column to connect
// to the Client Hub board.
function isConnectBoardsMismatch(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /not in the connected boards/i.test(msg)
}

// Auto-discovers key columns on a board (owner, date, status, client) so
// users don't have to configure MONDAY_*_COL_ID env vars manually. Env vars
// still win if set. Cached per board.
type BoardColumns = { owner: string | null; date: string | null; status: string | null; client: string | null }
const boardColumnsCache = new Map<string, BoardColumns>()

function pickColumn(
  cols: Array<{ id: string; title: string; type: string }>,
  type: string,
  titleRegex: RegExp,
): string | null {
  return (
    cols.find(c => c.type === type && titleRegex.test(c.title))?.id ??
    cols.find(c => c.type === type)?.id ??
    null
  )
}

export async function resolveBoardColumns(boardId: string): Promise<BoardColumns> {
  const env: BoardColumns = {
    owner:  process.env.MONDAY_OWNER_COL_ID  ?? null,
    date:   process.env.MONDAY_DATE_COL_ID   ?? null,
    status: process.env.MONDAY_STATUS_COL_ID ?? null,
    client: process.env.MONDAY_CLIENT_COL_ID ?? null,
  }
  if (env.owner && env.date && env.status && env.client) return env
  if (!boardId) return env
  if (boardColumnsCache.has(boardId)) return boardColumnsCache.get(boardId)!
  try {
    const data = await gql(`
      query {
        boards(ids: [${boardId}]) {
          columns { id title type }
        }
      }
    `)
    const cols: Array<{ id: string; title: string; type: string }> = data.boards?.[0]?.columns ?? []
    const resolved: BoardColumns = {
      owner:  env.owner  ?? pickColumn(cols, 'people', /owner|person|assign/i),
      date:   env.date   ?? pickColumn(cols, 'date', /due|deadline|date/i),
      status: env.status ?? pickColumn(cols, 'status', /status/i),
      client: env.client ?? pickColumn(cols, 'board_relation', /client|customer|brand/i),
    }
    boardColumnsCache.set(boardId, resolved)
    const missing = (Object.keys(resolved) as Array<keyof BoardColumns>).filter(k => !resolved[k])
    if (missing.length > 0) {
      console.warn(`[monday] Board ${boardId} missing columns for: ${missing.join(', ')}. Add the corresponding column types on that board.`)
    }
    return resolved
  } catch (err) {
    console.error('[monday] resolveBoardColumns failed:', err)
    return env
  }
}

// Creates the parent brief item in Monday.com
export async function createMondayItem(brief: BriefFormData, clientHubItemId?: string | null, groupId?: string, ownerUserId?: number | null): Promise<{
  itemId: string
  itemUrl: string
  description: string
  boardId: string
}> {
  const boardId = await resolveBoardId(brief.pipeline)
  if (!boardId) throw new Error('No Monday.com board could be resolved for this pipeline. Set MONDAY_ORGANIC_BOARD_ID or ensure a matching board exists.')

  // Prefer the first video's hook as the task name, then its content pillar
  const firstHook = brief.videos?.[0]?.hook?.trim()
  const firstPillar = brief.videos?.[0]?.angleObjective?.trim()
  const rawTopic = firstHook || firstPillar || ''
  const topic = rawTopic.length > 80 ? rawTopic.slice(0, 77).trimEnd() + '…' : rawTopic
  const itemName = topic || `Shoot — ${brief.shootDate}`
  const description = briefDescription(brief)

  const { owner: ownerCol, date: dateCol, status: statusCol, client: clientCol } = await resolveBoardColumns(boardId)
  const targetGroupId = groupId || process.env.MONDAY_TODO_GROUP_ID
  const groupClause = targetGroupId
    ? `, group_id: ${JSON.stringify(targetGroupId)}`
    : ''

  const runCreate = async (includeClient: boolean) => {
    const colVals = buildColumnValues({
      ...(statusCol ? { [statusCol]: { label: 'Editing' } } : {}),
      ...(dateCol && brief.shootDate ? { [dateCol]: { date: brief.shootDate } } : {}),
      ...(includeClient && clientCol && clientHubItemId ? { [clientCol]: { item_ids: [Number(clientHubItemId)] } } : {}),
      ...(ownerCol && ownerUserId ? { [ownerCol]: { personsAndTeams: [{ id: ownerUserId, kind: 'person' }] } } : {}),
    })
    return gql(`
      mutation {
        create_item(
          board_id: ${boardId}${groupClause},
          item_name: ${JSON.stringify(itemName)},
          column_values: ${JSON.stringify(colVals)}
        ) { id url }
      }
    `)
  }

  let data
  try {
    data = await runCreate(true)
  } catch (err) {
    if (isConnectBoardsMismatch(err) && clientHubItemId) {
      console.warn('[monday] Client connect column on pipeline board does not accept items from MONDAY_CLIENT_HUB_BOARD_ID. Creating brief without client link. Fix: reconfigure the Connect Boards column on the pipeline board to connect to the Client Hub board.')
      data = await runCreate(false)
    } else {
      throw err
    }
  }

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
  brief?: BriefFormData,
  clientHubItemId?: string | null,
  groupId?: string,
  ownerUserId?: number | null
): Promise<Record<string, string>> {
  const itemIds: Record<string, string> = {}
  const { owner: ownerCol, date: dateCol, status: statusCol, client: clientCol } = await resolveBoardColumns(boardId)
  const targetGroupId = groupId || process.env.MONDAY_TODO_GROUP_ID
  const groupClause = targetGroupId
    ? `, group_id: ${JSON.stringify(targetGroupId)}`
    : ''

  for (const v of videos) {
    const raw = v.hook || v.angleObjective || ''
    const label = raw.length > 60 ? raw.slice(0, 57).trimEnd() + '…' : raw
    const itemName = `${label ? `${label} — ` : ''}${v.format || 'VIDEO'}${v.duration ? ` (${v.duration})` : ''}`

    const buildVals = (includeClient: boolean) => buildColumnValues({
      ...(statusCol ? { [statusCol]: { label: 'Editing' } } : {}),
      ...(dateCol && (v.deadline || brief?.shootDate) ? { [dateCol]: { date: v.deadline || brief!.shootDate } } : {}),
      ...(includeClient && clientCol && clientHubItemId ? { [clientCol]: { item_ids: [Number(clientHubItemId)] } } : {}),
      ...(ownerCol && ownerUserId ? { [ownerCol]: { personsAndTeams: [{ id: ownerUserId, kind: 'person' }] } } : {}),
    })
    const colVals = buildVals(true)

    const contentLines = (v.contentLinks ?? [])
      .filter(cl => cl.url?.trim())
      .map((cl, i) => `**Content Link${i > 0 ? ` ${i+1}` : ''}:** ${cl.url}${cl.notes ? ` — ${cl.notes}` : ''}`)

    const descLines = [
      brief?.shootDate           && `**Shoot Date:** ${brief.shootDate}`,
      brief?.assignedEditor      && `**Editor:** ${brief.assignedEditor}`,
      v.angleObjective           && `**Content Pillar:** ${v.angleObjective}`,
      v.hook                     && `**First 10 seconds:** ${v.hook}`,
      ...contentLines,
      v.scriptLink               && `**Script:** ${v.scriptLink}`,
      v.musicLink                && `**Music:** ${v.musicLink}`,
      v.textOverlays             && `**Text Overlays:** ${v.textOverlays}`,
      v.specialNotes             && `**Special Notes:** ${v.specialNotes}`,
      brief?.generalInstructions && `**General Instructions:** ${brief.generalInstructions}`,
    ].filter(Boolean).join('\n')

    const runCreate = (vals: string) => gql(`
      mutation {
        create_item(
          board_id: ${boardId}${groupClause},
          item_name: ${JSON.stringify(itemName)},
          column_values: ${JSON.stringify(vals)}
        ) { id }
      }
    `)

    try {
      let data
      try {
        data = await runCreate(colVals)
      } catch (err) {
        if (isConnectBoardsMismatch(err) && clientHubItemId) {
          console.warn(`[monday] Client connect column rejected video "${itemName}". Creating without client link. Fix the Connect Boards column configuration.`)
          data = await runCreate(buildVals(false))
        } else {
          throw err
        }
      }
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
  if (!boardId) return
  const { status: colId } = await resolveBoardColumns(boardId)
  if (!colId) return
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
