import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { CLIENTS } from '@/lib/constants'

const KEY = 'clients:custom'

export async function GET() {
  const redis = await getRedis()
  if (!redis) return NextResponse.json([...CLIENTS])
  const raw = await redis.get(KEY)
  await redis.quit()
  const custom: string[] = raw ? JSON.parse(raw) : []
  return NextResponse.json([...CLIENTS, ...custom])
}

export async function POST(request: NextRequest) {
  const { name } = (await request.json()) as { name: string }
  const trimmed = name?.trim().toUpperCase()

  if (!trimmed || trimmed.length < 2) {
    return NextResponse.json({ error: 'Name too short' }, { status: 400 })
  }
  if (CLIENTS.includes(trimmed as typeof CLIENTS[number])) {
    return NextResponse.json({ error: 'Already exists' }, { status: 409 })
  }

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const raw = await redis.get(KEY)
  const custom: string[] = raw ? JSON.parse(raw) : []

  if (custom.includes(trimmed)) {
    await redis.quit()
    return NextResponse.json({ error: 'Already exists' }, { status: 409 })
  }

  custom.push(trimmed)
  await redis.set(KEY, JSON.stringify(custom))
  await redis.quit()

  return NextResponse.json({ success: true, clients: [...CLIENTS, ...custom] })
}
