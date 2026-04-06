// Utility endpoint — call once during setup to discover custom field IDs
// GET /api/clickup-fields
import { NextResponse } from 'next/server'
import { getListCustomFields } from '@/lib/clickup'

export async function GET() {
  try {
    const data = await getListCustomFields()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
