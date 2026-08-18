import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import type { StoredBrief } from '@/lib/types'

async function loadAll(): Promise<Array<{ id: string; submittedAt: string; pipeline: string; client: string }>> {
  const redis = await getRedis()
  if (!redis) return []
  const ids = await redis.lrange('briefs:index', 0, -1)
  if (ids.length === 0) { await redis.quit(); return [] }
  const raws = await redis.mget(...ids.map((id) => `brief:${id}`))
  await redis.quit()
  const out: Array<{ id: string; submittedAt: string; pipeline: string; client: string }> = []
  for (let i = 0; i < ids.length; i++) {
    const raw = raws[i]
    if (!raw) continue
    try {
      const stored = JSON.parse(raw) as StoredBrief
      out.push({
        id: ids[i],
        submittedAt: stored.submittedAt || '',
        pipeline: stored.brief?.pipeline || '',
        client: stored.brief?.client || '',
      })
    } catch {}
  }
  return out
}

export async function GET() {
  const briefs = await loadAll()
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const buckets = { last30: 0, days30to90: 0, older: 0, unknown: 0 }
  for (const b of briefs) {
    if (!b.submittedAt) { buckets.unknown++; continue }
    const age = now - new Date(b.submittedAt).getTime()
    if (age < 30 * day) buckets.last30++
    else if (age < 90 * day) buckets.days30to90++
    else buckets.older++
  }
  return NextResponse.json({
    total: briefs.length,
    ageBuckets: buckets,
    olderThan90Days: briefs.filter(b => b.submittedAt && (now - new Date(b.submittedAt).getTime()) >= 90 * day)
      .map(b => ({ id: b.id, submittedAt: b.submittedAt, pipeline: b.pipeline, client: b.client })),
  })
}
