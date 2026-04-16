import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { updateSubtaskStatus } from '@/lib/clickup'
import type { BriefStatus, StoredBrief } from '@/lib/types'

const CLICKUP_STATUS_MAP: Record<BriefStatus, string> = {
  'not-started': 'in edit',
  'in-edit': 'in edit',
  'amendments': 'amendments',
  'in-review': 'client review',
  'approved': 'approved',
  'scheduled': 'scheduled/sent',
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

  // Update this video's status
  if (!stored.videoStatuses) stored.videoStatuses = {}
  stored.videoStatuses[videoId] = status

  // Save asset URL if provided
  if (assetUrl) {
    if (!stored.videoAssetUrls) stored.videoAssetUrls = {}
    stored.videoAssetUrls[videoId] = assetUrl
  }

  await redis.set(`brief:${taskId}`, JSON.stringify(stored), 'KEEPTTL')
  await redis.quit()

  // Update the ClickUp subtask status in background
  const subtaskId = stored.videoSubtaskIds?.[videoId]
  if (subtaskId) {
    updateSubtaskStatus(subtaskId, CLICKUP_STATUS_MAP[status]).catch(console.error)
  }

  // Compute overall status to return to client
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
