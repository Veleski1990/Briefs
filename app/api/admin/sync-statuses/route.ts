import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import type { StoredBrief, BriefStatus } from '@/lib/types'
import { resolveBoardId, resolveBoardColumns } from '@/lib/monday'

const MONDAY_API = 'https://api.monday.com/v2'

// Reverse of MONDAY_STATUS_MAP — accepts anything Monday might return.
function mondayLabelToStatus(label: string | undefined | null): BriefStatus | null {
  if (!label) return null
  const l = label.toLowerCase().trim()
  if (l === 'approved') return 'approved'
  if (l === 'scheduled') return 'scheduled'
  if (l === 'amendments' || l === 'stuck') return 'amendments'
  if (l === 'in review' || l === 'review') return 'in-review'
  if (l === 'editing' || l === 'in edit') return 'in-edit'
  if (l === 'to brief' || l === 'to shoot' || l === 'not started') return 'not-started'
  return null
}

async function gql(query: string) {
  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MONDAY_API_KEY!}`,
      'API-Version': '2023-10',
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Monday API ${res.status}: ${await res.text()}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

// POST /api/admin/sync-statuses
// Pulls current status from Monday.com for every stored brief's video subtasks
// and updates the Redis snapshot so the dashboard reflects reality.
export async function POST() {
  if (!process.env.MONDAY_API_KEY) {
    return NextResponse.json({ error: 'MONDAY_API_KEY not configured' }, { status: 500 })
  }

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const ids = await redis.lrange('briefs:index', 0, -1)
  if (ids.length === 0) {
    await redis.quit()
    return NextResponse.json({ scanned: 0, updated: 0, unchanged: 0, notes: [] })
  }

  const raws = await redis.mget(...ids.map((id) => `brief:${id}`))

  // Collect every Monday item id we need to query, plus a map from itemId -> { briefId, videoId }
  type Ref = { briefId: string; videoId: string }
  const itemIdToRef = new Map<string, Ref>()
  const briefsById = new Map<string, StoredBrief>()
  for (let i = 0; i < ids.length; i++) {
    const raw = raws[i]
    if (!raw) continue
    try {
      const stored = JSON.parse(raw) as StoredBrief
      briefsById.set(ids[i], stored)
      const map = stored.videoSubtaskIds ?? {}
      for (const [videoId, itemId] of Object.entries(map)) {
        if (itemId) itemIdToRef.set(String(itemId), { briefId: ids[i], videoId })
      }
    } catch {}
  }

  if (itemIdToRef.size === 0) {
    await redis.quit()
    return NextResponse.json({ scanned: ids.length, updated: 0, unchanged: 0, notes: ['No video subtask ids stored — nothing to sync.'] })
  }

  // We need to know which column is the Status column on each pipeline board.
  // Discover it once per board.
  const boardColumnsCache = new Map<string, string | null>()
  async function statusColFor(pipeline: string | undefined): Promise<string | null> {
    const boardId = await resolveBoardId(pipeline)
    if (!boardId) return null
    if (boardColumnsCache.has(boardId)) return boardColumnsCache.get(boardId) ?? null
    const cols = await resolveBoardColumns(boardId)
    boardColumnsCache.set(boardId, cols.status)
    return cols.status
  }

  // Batch-query Monday for status column values, 25 items at a time
  const itemIds = Array.from(itemIdToRef.keys())
  const chunkSize = 25
  const itemLabels = new Map<string, string>()
  for (let i = 0; i < itemIds.length; i += chunkSize) {
    const chunk = itemIds.slice(i, i + chunkSize)
    const query = `query { items(ids: [${chunk.join(',')}]) { id column_values { id text } } }`
    try {
      const data = await gql(query)
      for (const item of data.items ?? []) {
        const cols = item.column_values ?? []
        // We don't yet know which column is status for this item's board — take any status-typed column titled anything sensible.
        // Simpler: match by common Monday status column ids (project_status) or by text that looks like a status label.
        const statusCol = cols.find((c: { id: string }) => c.id === 'project_status')
          ?? cols.find((c: { id: string; text?: string }) => c.text && mondayLabelToStatus(c.text) !== null)
        if (statusCol?.text) itemLabels.set(String(item.id), statusCol.text as string)
      }
    } catch (err) {
      console.error('[sync-statuses] Monday batch query failed:', err)
    }
  }

  // Apply updates back to Redis
  let updated = 0
  let unchanged = 0
  const notes: string[] = []
  const briefsToWrite = new Map<string, StoredBrief>()

  for (const [itemId, ref] of itemIdToRef.entries()) {
    const label = itemLabels.get(itemId)
    const newStatus = mondayLabelToStatus(label)
    if (!newStatus) continue // Monday returned nothing or an unknown label
    const stored = briefsById.get(ref.briefId)
    if (!stored) continue
    const currentStatus = stored.videoStatuses?.[ref.videoId]
    if (currentStatus === newStatus) { unchanged++; continue }
    if (!stored.videoStatuses) stored.videoStatuses = {}
    stored.videoStatuses[ref.videoId] = newStatus
    briefsToWrite.set(ref.briefId, stored)
    updated++
  }

  if (briefsToWrite.size > 0) {
    // Discover status columns lazily (unused above but reserved for future improvements)
    for (const brief of briefsToWrite.values()) {
      await statusColFor(brief.brief.pipeline).catch(() => null)
    }
    const pipeline = redis.pipeline()
    for (const [briefId, stored] of briefsToWrite.entries()) {
      pipeline.set(`brief:${briefId}`, JSON.stringify(stored), 'KEEPTTL')
    }
    await pipeline.exec()
  }

  await redis.quit()

  return NextResponse.json({
    scanned: ids.length,
    videosScanned: itemIdToRef.size,
    videosSyncedFromMonday: itemLabels.size,
    updated,
    unchanged,
    notes,
  })
}
