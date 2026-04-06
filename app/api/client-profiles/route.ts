import { NextRequest, NextResponse } from 'next/server'

const PROFILES_KEY = 'client-profiles'

async function getRedis() {
  if (!process.env.REDIS_URL) return null
  const { default: Redis } = await import('ioredis')
  return new Redis(process.env.REDIS_URL)
}

function readLocalProfiles() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require('path')
  return JSON.parse(readFileSync(join(process.cwd(), 'lib', 'client-profiles.json'), 'utf-8'))
}

function writeLocalProfiles(data: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writeFileSync } = require('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require('path')
  writeFileSync(join(process.cwd(), 'lib', 'client-profiles.json'), JSON.stringify(data, null, 2))
}

export async function GET() {
  try {
    const redis = await getRedis()
    if (redis) {
      const raw = await redis.get(PROFILES_KEY)
      await redis.quit()
      return NextResponse.json(raw ? JSON.parse(raw) : {})
    }
    return NextResponse.json(readLocalProfiles())
  } catch {
    return NextResponse.json({}, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, profile } = await request.json()
    const redis = await getRedis()

    if (redis) {
      const raw = await redis.get(PROFILES_KEY)
      const current = raw ? JSON.parse(raw) : {}
      current[client] = profile
      await redis.set(PROFILES_KEY, JSON.stringify(current))
      await redis.quit()
    } else {
      const profiles = readLocalProfiles()
      profiles[client] = profile
      writeLocalProfiles(profiles)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
