import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  CLIENTS,
  PLATFORMS,
  PIPELINES,
  VIDEO_FORMATS,
  FUNNEL_STAGES,
  TEAM_MEMBERS,
} from '@/lib/constants'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a form-filling assistant for a media agency called Creative AI Media.
You receive a voice transcript and extract structured data to fill an editor brief form.

The form has these fields:
- pipeline: one of ${PIPELINES.join(', ')}
- client: one of ${CLIENTS.join(', ')}
- platform: one of ${PLATFORMS.join(', ')}
- shootDate: ISO date string (YYYY-MM-DD), today is ${new Date().toISOString().split('T')[0]}
- dateSent: ISO date string (YYYY-MM-DD)
- briefFilledBy: one of ${TEAM_MEMBERS.join(', ')}
- whatWasFilmed: free text
- locationVibe: free text
- shootObjective: free text
- funnelStage: one of ${FUNNEL_STAGES.join(', ')} (TOF=awareness, MOF=social proof, BOF=conversion)
- clientBriefLink: URL string
- generalInstructions: free text
- assignedEditor: free text (editor's name, e.g. "Mo")
- videos: array of video objects, each with:
  - format: one of ${VIDEO_FORMATS.join(', ')}
  - duration: string like "30s", "60s", "2min"
  - angleObjective: free text
  - hook: free text describing the first 3 seconds
  - aRollLinks: newline-separated URLs for main/talking-head footage
  - bRollLinks: newline-separated URLs for cutaway/supporting footage
  - scriptLink: URL
  - musicLink: URL
  - textOverlays: free text
  - specialNotes: free text
  - deadline: ISO date string (YYYY-MM-DD) if a date is given, otherwise omit

Rules:
- Only include fields you are confident about from the transcript
- For client names, match to the closest option (e.g. "mama" → "MAMA MANOUSH")
- For dates, interpret relative terms like "Tuesday", "yesterday", "last week" relative to today
- If multiple videos are mentioned, create multiple video objects
- Omit any field you are not sure about — do not guess
- Return ONLY valid JSON, no explanation, no markdown, no code blocks`

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured.' }, { status: 500 })
    }

    const { transcript } = await request.json()
    if (!transcript?.trim()) {
      return NextResponse.json({ error: 'No transcript provided.' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract form data from this voice transcript:\n\n"${transcript}"`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ data: parsed })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[parse-voice]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
