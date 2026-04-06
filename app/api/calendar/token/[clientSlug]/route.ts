import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

function tokenKey(slug: string) { return `calendar-token:${slug}` }

function makeToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

// GET — retrieve existing token (or null)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientSlug: string }> }
) {
  const { clientSlug } = await params
  const redis = await getRedis()
  if (!redis) return NextResponse.json({ token: null })
  const token = await redis.get(tokenKey(clientSlug))
  await redis.quit()
  return NextResponse.json({ token })
}

// POST — generate (or regenerate) a token
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientSlug: string }> }
) {
  const { clientSlug } = await params
  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })
  const token = makeToken()
  await redis.set(tokenKey(clientSlug), token)
  await redis.quit()
  return NextResponse.json({ token })
}

// HEAD — validate a token (used by client page middleware check)
export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ clientSlug: string }> }
) {
  const { clientSlug } = await params
  const t = req.nextUrl.searchParams.get('t')
  if (!t) return new NextResponse(null, { status: 401 })

  const redis = await getRedis()
  if (!redis) return new NextResponse(null, { status: 503 })
  const stored = await redis.get(tokenKey(clientSlug))
  await redis.quit()

  if (stored !== t) return new NextResponse(null, { status: 401 })
  return new NextResponse(null, { status: 200 })
}
