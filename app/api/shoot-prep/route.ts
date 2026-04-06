import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ShootPrepInput {
  client: string
  shootDate: string        // YYYY-MM-DD
  shooter: string          // e.g. Olivia
  location: string
  locationAddress?: string
  generalObjective: string // what this shoot is trying to achieve overall
  equipment: string[]      // e.g. ["Sony camera", "iPhone", "Gimbal", "Ring light"]
  plannedVideos: {
    title: string          // e.g. "Sources of the Week"
    concept: string        // what it is / what it needs to look like
    clientOnCamera: boolean
    keyMessages?: string   // if client on camera, what should they say
    outfitNotes?: string
    specificProps?: string
    format: string         // REEL, STORY, etc.
  }[]
  clientContactName?: string
  additionalClientNotes?: string
}

const SYSTEM = `You are a creative production coordinator for Creative AI Media, a social media agency.
You generate two documents from shoot details:

1. OLIVIA'S SHOOT PACK — a practical, checklist-style internal document for the shooter. Clear, organised, no fluff.
2. CLIENT PREP DOC — a friendly, professional document sent to the client the night before so they show up prepared. Warm but concise.

Format your response as valid JSON with two keys: "oliviaPack" (markdown string) and "clientDoc" (markdown string).

For the OLIVIA PACK include:
- Shot list per video (numbered, with notes on angle, framing, and what to capture for A-roll vs B-roll)
- Equipment to bring based on the equipment list provided
- Drive folder structure to create for this shoot (exact folder names, nested)
- Timing guidance (roughly how long each setup might take)
- Reminders specific to the shoot

For the CLIENT DOC include:
- What to wear (colours that work on camera, what to avoid)
- What to prepare mentally (key messages per video they appear in, talking points, NOT a script — natural language)
- What to bring / have ready on the day
- What to expect during the shoot (so they're relaxed)
- Any logistics (time, location)
- Keep it encouraging and easy to read — clients are not production people`

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured.' }, { status: 500 })
    }

    const input: ShootPrepInput = await request.json()

    const userMessage = `Generate shoot prep documents for this shoot:

CLIENT: ${input.client}
DATE: ${input.shootDate}
SHOOTER: ${input.shooter}
LOCATION: ${input.location}${input.locationAddress ? ` (${input.locationAddress})` : ''}
OBJECTIVE: ${input.generalObjective}
EQUIPMENT: ${input.equipment.join(', ')}

PLANNED VIDEOS (${input.plannedVideos.length}):
${input.plannedVideos.map((v, i) => `
${i + 1}. "${v.title}" — ${v.format}
   Concept: ${v.concept}
   Client on camera: ${v.clientOnCamera ? 'YES' : 'No'}
   ${v.clientOnCamera && v.keyMessages ? `Key messages to get across: ${v.keyMessages}` : ''}
   ${v.outfitNotes ? `Outfit notes: ${v.outfitNotes}` : ''}
   ${v.specificProps ? `Props/items needed: ${v.specificProps}` : ''}
`).join('\n')}

${input.clientContactName ? `Client contact: ${input.clientContactName}` : ''}
${input.additionalClientNotes ? `Additional notes: ${input.additionalClientNotes}` : ''}

Return ONLY valid JSON with keys "oliviaPack" and "clientDoc". Both values are markdown strings.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ oliviaPack: parsed.oliviaPack, clientDoc: parsed.clientDoc })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[shoot-prep]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
