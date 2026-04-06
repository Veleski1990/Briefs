import { getRedis } from '@/lib/redis'
import type { StoredBrief } from '@/lib/types'
import { notFound } from 'next/navigation'
import BriefEditForm from './BriefEditForm'

export const dynamic = 'force-dynamic'

async function getStoredBrief(taskId: string): Promise<StoredBrief | null> {
  const redis = await getRedis()
  if (!redis) return null
  const raw = await redis.get(`brief:${taskId}`)
  await redis.quit()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed.brief) return null
    return parsed as StoredBrief
  } catch {
    return null
  }
}

export default async function EditBriefPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const stored = await getStoredBrief(taskId)
  if (!stored) notFound()

  return <BriefEditForm taskId={taskId} stored={stored} />
}
