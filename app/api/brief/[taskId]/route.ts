import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { buildUpdatedDescription, patchTaskBriefUrl } from '@/lib/clickup'
import type { BriefFormData, StoredBrief } from '@/lib/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const { brief }: { brief: BriefFormData } = await request.json()

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const raw = await redis.get(`brief:${taskId}`)
  if (!raw) {
    await redis.quit()
    return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
  }

  const stored: StoredBrief = JSON.parse(raw)
  stored.brief = brief
  stored.updatedAt = new Date().toISOString()

  await redis.set(`brief:${taskId}`, JSON.stringify(stored), 'KEEPTTL')
  await redis.quit()

  const description = buildUpdatedDescription(brief)
  patchTaskBriefUrl(taskId, description, stored.briefUrl).catch(console.error)

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  await redis.del(`brief:${taskId}`)
  await redis.lrem('briefs:index', 0, taskId)
  await redis.quit()

  return NextResponse.json({ success: true })
}
