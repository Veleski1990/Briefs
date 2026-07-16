import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { updateMondayStatus, MONDAY_STATUS_MAP } from '@/lib/monday'
import type { BriefStatus, StoredBrief } from '@/lib/types'

function getBoardId(pipeline?: string): string {
  const map: Record<string, string | undefined> = {
    'ORGANIC RETAINER':  process.env.MONDAY_ORGANIC_BOARD_ID,
    'PAID ADS RETAINER': process.env.MONDAY_PAID_BOARD_ID,
    'UGC PIPELINE':      process.env.MONDAY_UGC_BOARD_ID,
    'PROPERTY VIDEO':    process.env.MONDAY_PROPERTY_BOARD_ID,
  }
  return (pipeline && map[pipeline]) || process.env.MONDAY_ORGANIC_BOARD_ID || ''
}

const VALID_STATUSES: BriefStatus[] = ['not-started', 'in-edit', 'amendments', 'in-review', 'approved', 'scheduled']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const { videoId, status, assetUrl } = (await request.json()) as { videoId: string; status: BriefStatus; assetUrl?: string }

  if (!videoId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid videoId or status' }, { status: 400 })
  }

  const redis = await getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })
  }

  const raw = await redis.get(`brief:${taskId}`)
  if (!raw) {
    await redis.quit()
    return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
  }

  const stored: StoredBrief = JSON.parse(raw)

  if (!stored.videoStatuses) stored.videoStatuses = {}
  stored.videoStatuses[videoId] = status

  if (assetUrl) {
    if (!stored.videoAssetUrls) stored.videoAssetUrls = {}
    stored.videoAssetUrls[videoId] = assetUrl
  }

  if (status === 'approved') {
    if (!stored.videoApprovedAt) stored.videoApprovedAt = {}
    if (!stored.videoApprovedAt[videoId]) {
      stored.videoApprovedAt[videoId] = new Date().toISOString()
    }
  } else {
    if (stored.videoApprovedAt?.[videoId]) {
      delete stored.videoApprovedAt[videoId]
    }
  }

  await redis.set(`brief:${taskId}`, JSON.stringify(stored), 'KEEPTTL')
  await redis.quit()

  // Sync status to Monday.com video item in background
  const subtaskId = stored.videoSubtaskIds?.[videoId]
  const boardId = getBoardId(stored.brief.pipeline)
  if (subtaskId && boardId) {
    updateMondayStatus(subtaskId, boardId, MONDAY_STATUS_MAP[status]).catch(console.error)
  }

  const allStatuses = Object.values(stored.videoStatuses)
  const overallStatus: BriefStatus =
    allStatuses.every((s) => s === 'scheduled')
      ? 'scheduled'
      : allStatuses.every((s) => s === 'approved' || s === 'scheduled')
      ? 'approved'
      : allStatuses.some((s) => s === 'amendments')
      ? 'amendments'
      : allStatuses.some((s) => s === 'in-review')
      ? 'in-review'
      : allStatuses.some((s) => s === 'in-edit')
      ? 'in-edit'
      : 'not-started'

  return NextResponse.json({ success: true, status, overallStatus })
}
