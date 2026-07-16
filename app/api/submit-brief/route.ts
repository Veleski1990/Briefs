import { NextRequest, NextResponse } from 'next/server'
import { createMondayItem, addBriefComment, createVideoItems } from '@/lib/monday'
import { getRedis } from '@/lib/redis'
import type { SubmitBriefPayload, SubmitBriefResponse, StoredBrief, BriefStatus, ClientProfile } from '@/lib/types'

const BRIEF_TTL_SECONDS = 60 * 60 * 24 * 180 // 180 days

async function notifyWebhook({
  brief,
  briefUrl,
  taskUrl,
  videoCount,
}: {
  brief: import('@/lib/types').BriefFormData
  briefUrl: string
  taskUrl: string
  videoCount: number
}) {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL
  if (!webhookUrl) return
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: brief.client,
        pipeline: brief.pipeline,
        platform: brief.platform,
        shootDate: brief.shootDate,
        videoCount,
        briefUrl,
        taskUrl,
        message: `📋 New brief — ${brief.client}\n${videoCount} video${videoCount !== 1 ? 's' : ''} · ${brief.pipeline || 'No pipeline'}\n${briefUrl}`,
      }),
    })
  } catch (err) {
    console.error('[notify-webhook]', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.MONDAY_API_KEY) {
      return NextResponse.json<SubmitBriefResponse>(
        { success: false, error: 'Monday.com API key not configured.' },
        { status: 500 }
      )
    }

    const body: SubmitBriefPayload = await request.json()
    const { brief } = body

    if (!brief.client || !brief.shootDate) {
      return NextResponse.json<SubmitBriefResponse>(
        { success: false, error: 'Client and shoot date are required.' },
        { status: 400 }
      )
    }

    const { itemId, itemUrl, description, boardId } = await createMondayItem(brief)

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://briefs-omega.vercel.app').trim()
    const briefUrl = `${baseUrl}/brief/${itemId}`

    // Initial per-video statuses — all start as not-started
    const videoStatuses: Record<string, BriefStatus> = {}
    for (const v of brief.videos) {
      videoStatuses[v.id] = 'not-started'
    }

    // Fetch client profile from Redis
    let clientProfile: ClientProfile | null = null
    const redis = await getRedis()
    if (redis) {
      const profilesRaw = await redis.get('client-profiles')
      if (profilesRaw) {
        const profiles = JSON.parse(profilesRaw)
        clientProfile = profiles[brief.client] ?? null
      }
    }

    // Create video items + add brief URL comment in parallel
    const [videoSubtaskIds] = await Promise.all([
      createVideoItems(boardId, brief.videos, brief),
      addBriefComment(itemId, briefUrl, description),
      notifyWebhook({ brief, briefUrl, taskUrl: itemUrl, videoCount: brief.videos.length }),
    ])

    const stored: StoredBrief = {
      brief,
      taskId: itemId,
      taskUrl: itemUrl,
      briefUrl,
      submittedAt: new Date().toISOString(),
      videoStatuses,
      videoSubtaskIds,
      clientProfile,
    }

    if (redis) {
      await redis.set(`brief:${itemId}`, JSON.stringify(stored), 'EX', BRIEF_TTL_SECONDS)
      await redis.lpush('briefs:index', itemId)
      await redis.quit()
    }

    return NextResponse.json<SubmitBriefResponse>({
      success: true,
      taskId: itemId,
      taskUrl: itemUrl,
      briefUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[submit-brief]', message)
    return NextResponse.json<SubmitBriefResponse>(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
