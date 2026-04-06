import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import type { CalendarPost } from '@/lib/calendar-types'

function postsKey(slug: string) { return `calendar:${slug}` }

// PUT — update a post (management side)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientSlug: string; postId: string }> }
) {
  const { clientSlug, postId } = await params
  const updated: Partial<CalendarPost> = await request.json()

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const raw = await redis.get(postsKey(clientSlug))
  const posts: CalendarPost[] = raw ? JSON.parse(raw) : []
  const idx = posts.findIndex((p) => p.id === postId)
  if (idx === -1) { await redis.quit(); return NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  posts[idx] = { ...posts[idx], ...updated }
  await redis.set(postsKey(clientSlug), JSON.stringify(posts), 'KEEPTTL')
  await redis.quit()
  return NextResponse.json({ success: true })
}

// DELETE — remove a post
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientSlug: string; postId: string }> }
) {
  const { clientSlug, postId } = await params

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const raw = await redis.get(postsKey(clientSlug))
  const posts: CalendarPost[] = raw ? JSON.parse(raw) : []
  const filtered = posts.filter((p) => p.id !== postId)
  await redis.set(postsKey(clientSlug), JSON.stringify(filtered), 'KEEPTTL')
  await redis.quit()
  return NextResponse.json({ success: true })
}

// PATCH — client approval action
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientSlug: string; postId: string }> }
) {
  const { clientSlug, postId } = await params
  const { status, clientNote } = await request.json()

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const raw = await redis.get(postsKey(clientSlug))
  const posts: CalendarPost[] = raw ? JSON.parse(raw) : []
  const idx = posts.findIndex((p) => p.id === postId)
  if (idx === -1) { await redis.quit(); return NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  posts[idx].status = status
  posts[idx].respondedAt = new Date().toISOString()
  if (clientNote !== undefined) posts[idx].clientNote = clientNote
  await redis.set(postsKey(clientSlug), JSON.stringify(posts), 'KEEPTTL')
  await redis.quit()
  return NextResponse.json({ success: true })
}
