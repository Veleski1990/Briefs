import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { CLIENTS } from '@/lib/constants'

const CUSTOM_KEY = 'clients:custom'
const OVERRIDES_KEY = 'clients:overrides'  // { ORIGINAL_BUILTIN: DISPLAY_NAME }
const HIDDEN_KEY = 'clients:hidden'        // string[] — archived clients
const PROFILES_KEY = 'client-profiles'

type ClientMeta = {
  name: string          // display name
  isCustom: boolean
  isHidden: boolean
  originalName?: string // for built-ins that have been renamed
}

async function loadStores(redis: import('ioredis').Redis) {
  const [overridesRaw, hiddenRaw, customRaw] = await Promise.all([
    redis.get(OVERRIDES_KEY),
    redis.get(HIDDEN_KEY),
    redis.get(CUSTOM_KEY),
  ])
  return {
    overrides: (overridesRaw ? JSON.parse(overridesRaw) : {}) as Record<string, string>,
    hidden: (hiddenRaw ? JSON.parse(hiddenRaw) : []) as string[],
    custom: (customRaw ? JSON.parse(customRaw) : []) as string[],
  }
}

// GET /api/clients          → string[] of active client names (for dropdowns)
// GET /api/clients?all=1    → ClientMeta[] including hidden ones (for management)
export async function GET(request: NextRequest) {
  const includeAll = request.nextUrl.searchParams.get('all') === '1'

  const redis = await getRedis()
  if (!redis) {
    return includeAll
      ? NextResponse.json(CLIENTS.map(c => ({ name: c, isCustom: false, isHidden: false })))
      : NextResponse.json([...CLIENTS])
  }

  const { overrides, hidden, custom } = await loadStores(redis)
  await redis.quit()

  const builtins: ClientMeta[] = CLIENTS.map(orig => {
    const name = overrides[orig] || orig
    return {
      name,
      isCustom: false,
      isHidden: hidden.includes(name),
      ...(overrides[orig] ? { originalName: orig } : {}),
    }
  })

  const customs: ClientMeta[] = custom.map(name => ({
    name,
    isCustom: true,
    isHidden: hidden.includes(name),
  }))

  const all = [...builtins, ...customs]

  if (includeAll) return NextResponse.json(all)
  return NextResponse.json(all.filter(c => !c.isHidden).map(c => c.name))
}

// POST — add a new custom client
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

  const { custom, overrides } = await loadStores(redis)

  // Reject if name collides with a renamed builtin
  const allNames = [...CLIENTS.map(c => overrides[c] || c), ...custom]
  if (allNames.includes(trimmed)) {
    await redis.quit()
    return NextResponse.json({ error: 'Already exists' }, { status: 409 })
  }

  custom.push(trimmed)
  await redis.set(CUSTOM_KEY, JSON.stringify(custom))
  await redis.quit()

  return NextResponse.json({ success: true })
}

// PATCH — rename any client (built-in or custom)
export async function PATCH(request: NextRequest) {
  const { oldName, newName } = (await request.json()) as { oldName: string; newName: string }
  const trimmed = newName?.trim().toUpperCase()

  if (!trimmed || trimmed.length < 2) {
    return NextResponse.json({ error: 'Name too short' }, { status: 400 })
  }
  if (oldName === trimmed) {
    return NextResponse.json({ success: true }) // no-op
  }

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const { custom, overrides } = await loadStores(redis)

  // Find which pool oldName belongs to
  const builtinMatch = CLIENTS.find(orig => (overrides[orig] || orig) === oldName)
  const customIdx = custom.indexOf(oldName)

  if (!builtinMatch && customIdx === -1) {
    await redis.quit()
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Reject if new name collides
  const otherNames = [
    ...CLIENTS.map(c => overrides[c] || c),
    ...custom,
  ].filter(n => n !== oldName)
  if (otherNames.includes(trimmed)) {
    await redis.quit()
    return NextResponse.json({ error: 'Name already in use' }, { status: 409 })
  }

  if (builtinMatch) {
    overrides[builtinMatch] = trimmed
    await redis.set(OVERRIDES_KEY, JSON.stringify(overrides))
  } else {
    custom[customIdx] = trimmed
    await redis.set(CUSTOM_KEY, JSON.stringify(custom))
  }

  // Move profile data
  const profilesRaw = await redis.get(PROFILES_KEY)
  if (profilesRaw) {
    const profiles = JSON.parse(profilesRaw)
    if (profiles[oldName]) {
      profiles[trimmed] = profiles[oldName]
      delete profiles[oldName]
      await redis.set(PROFILES_KEY, JSON.stringify(profiles))
    }
  }

  await redis.quit()
  return NextResponse.json({ success: true })
}

// DELETE — archive/unarchive a client (soft delete, preserves history)
// body: { name: string, hidden: boolean }
export async function DELETE(request: NextRequest) {
  const { name, hidden: shouldHide } = (await request.json()) as { name: string; hidden: boolean }

  const redis = await getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const { hidden } = await loadStores(redis)
  const idx = hidden.indexOf(name)

  if (shouldHide && idx === -1) hidden.push(name)
  if (!shouldHide && idx !== -1) hidden.splice(idx, 1)

  await redis.set(HIDDEN_KEY, JSON.stringify(hidden))
  await redis.quit()
  return NextResponse.json({ success: true })
}
