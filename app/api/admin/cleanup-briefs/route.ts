import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import type { StoredBrief } from '@/lib/types'

// POST /api/admin/cleanup-briefs
// Body: { olderThanDays: number, dryRun?: boolean, confirm?: "YES-DELETE" }
// Deletes stored briefs whose submittedAt is older than olderThanDays.
// dryRun returns the list without deleting.
export async function POST(request: NextRequest) {
  const { olderThanDays, dryRun = false, confirm } = (await request.json().catch(() => ({}))) as {
    olderThanDays?: number
    dryRun?: boolean
    confirm?: string
  }

  if (typeof olderThanDays !== 'number' || olderThanDays < 1) {
    return NextResponse.json({ error: 'olderThanDays (number ≥ 1) required' }, { status: 400 })
  }
  if (!dryRun && confirm !== 'YES-DELETE') {
    return NextResponse.json({ error: 'confirm must be "YES-DELETE" for a real delete (or set dryRun=true)' }, { status: 400 })
  }

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const ids = await redis.lrange('briefs:index', 0, -1)
  if (ids.length === 0) {
    await redis.quit()
    return NextResponse.json({ scanned: 0, deleted: 0, victims: [] })
  }

  const raws = await redis.mget(...ids.map((id) => `brief:${id}`))
  const cutoffMs = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
  const victims: Array<{ id: string; submittedAt: string; client: string; pipeline: string }> = []

  for (let i = 0; i < ids.length; i++) {
    const raw = raws[i]
    if (!raw) continue
    let stored: StoredBrief
    try { stored = JSON.parse(raw) as StoredBrief } catch { continue }
    const submittedAt = stored.submittedAt || ''
    if (!submittedAt) continue // never delete briefs with unknown submission date
    const submittedMs = new Date(submittedAt).getTime()
    if (isNaN(submittedMs) || submittedMs >= cutoffMs) continue
    victims.push({
      id: ids[i],
      submittedAt,
      client: stored.brief?.client || '',
      pipeline: stored.brief?.pipeline || '',
    })
  }

  if (dryRun) {
    await redis.quit()
    return NextResponse.json({ scanned: ids.length, wouldDelete: victims.length, victims })
  }

  // Batch delete keys and remove from index
  const pipeline = redis.pipeline()
  for (const v of victims) {
    pipeline.del(`brief:${v.id}`)
    pipeline.lrem('briefs:index', 0, v.id)
  }
  await pipeline.exec()
  await redis.quit()

  return NextResponse.json({ scanned: ids.length, deleted: victims.length, victims })
}
