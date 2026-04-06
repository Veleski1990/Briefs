import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import type { CalendarPost } from '@/lib/calendar-types'

const TTL = 60 * 60 * 24 * 365 // 1 year

function postsKey(slug: string) { return `calendar:${slug}` }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientSlug: string }> }
) {
  const { clientSlug } = await params
  const redis = await getRedis()
  if (!redis) return NextResponse.json([], { status: 200 })
  const raw = await redis.get(postsKey(clientSlug))
  await redis.quit()
  return NextResponse.json(raw ? JSON.parse(raw) : [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientSlug: string }> }
) {
  const { clientSlug } = await params
  const post: CalendarPost = await request.json()

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const raw = await redis.get(postsKey(clientSlug))
  const posts: CalendarPost[] = raw ? JSON.parse(raw) : []
  posts.push(post)
  await redis.set(postsKey(clientSlug), JSON.stringify(posts), 'EX', TTL)
  await redis.quit()

  return NextResponse.json({ success: true })
}
