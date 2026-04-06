'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  CLIENTS,
  PLATFORMS,
  PIPELINES,
  PIPELINE_DESCRIPTIONS,
  FUNNEL_STAGES,
  FUNNEL_STAGE_DESCRIPTIONS,
  TEAM_MEMBERS,
} from '@/lib/constants'
import type { BriefFormData, VideoRow, SubmitBriefResponse } from '@/lib/types'
import SectionHeading from '@/components/SectionHeading'
import SelectField from '@/components/SelectField'
import TextField from '@/components/TextField'
import VideoRowCard from '@/components/VideoRowCard'
import VoiceButton from '@/components/VoiceButton'
import ClientStylePanel from '@/components/ClientStylePanel'

function SuccessBanner({ briefUrl, taskUrl }: { briefUrl: string; taskUrl?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(briefUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-brand-accent bg-brand-maroon shadow-lg">
      <div className="px-5 py-4">
        <p className="text-sm font-bold text-brand-accent">Brief submitted!</p>
        <p className="mt-0.5 text-xs text-brand-offwhite opacity-80">
          ClickUp task created. Copy the editor brief link below to share with your editor.
        </p>
      </div>
      <div className="border-t border-brand-accent/20 bg-black/20 px-5 py-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-accent/60">Editor Brief Link (view-only)</p>
        <div className="flex items-center gap-2">
          <a
            href={briefUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate rounded-lg bg-white/10 px-3 py-2 text-xs text-brand-offwhite hover:bg-white/20"
          >
            {briefUrl}
          </a>
          <button
            type="button"
            onClick={copy}
            className="flex-shrink-0 rounded-lg bg-brand-accent px-3 py-2 text-xs font-semibold text-brand-maroon transition-all hover:opacity-90"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
      {taskUrl && (
        <div className="border-t border-brand-accent/10 px-5 py-3">
          <a
            href={taskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-brand-offwhite hover:bg-white/20 transition-all"
          >
            Open ClickUp task →
          </a>
        </div>
      )}
    </div>
  )
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function emptyVideo(id: string): VideoRow {
  return {
    id,
    format: '',
    duration: '',
    angleObjective: '',
    hook: '',
    aRollLinks: '',
    bRollLinks: '',
    scriptLink: '',
    musicLink: '',
    textOverlays: '',
    specialNotes: '',
    deadline: '',
  }
}

function emptyForm(): BriefFormData {
  return {
    pipeline: '',
    client: '',
    shootDate: '',
    briefFilledBy: '',
    dateSent: '',
    whatWasFilmed: '',
    locationVibe: '',
    shootObjective: '',
    funnelStage: '',
    platform: '',
    clientBriefLink: '',
    referenceLinks: '',
    videos: [emptyVideo('video-1')],
    generalInstructions: '',
    assignedEditor: '',
  }
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export default function BriefPage() {
  const [form, setForm] = useState<BriefFormData>(emptyForm)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [result, setResult] = useState<SubmitBriefResponse | null>(null)
  const [clientProfiles, setClientProfiles] = useState<Record<string, unknown>>({})
  const videoCounter = useRef(2)

  // Set date fields on client only to avoid SSR/client mismatch
  useEffect(() => {
    const t = today()
    setForm((prev) => ({ ...prev, shootDate: t, dateSent: t }))
  }, [])

  // Load client profiles
  useEffect(() => {
    fetch('/api/client-profiles')
      .then((r) => r.json())
      .then(setClientProfiles)
      .catch(() => {})
  }, [])

  // --- field helpers ---

  const setField = useCallback(
    <K extends keyof BriefFormData>(key: K, value: BriefFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // --- video helpers ---

  const addVideo = () => {
    const id = `video-${videoCounter.current++}`
    setForm((prev) => ({ ...prev, videos: [...prev.videos, emptyVideo(id)] }))
  }

  const removeVideo = (id: string) => {
    setForm((prev) => ({
      ...prev,
      videos: prev.videos.filter((v) => v.id !== id),
    }))
  }

  const updateVideo = (id: string, field: keyof VideoRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      videos: prev.videos.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      ),
    }))
  }

  // --- voice fill ---

  const handleVoiceFill = useCallback((data: Partial<BriefFormData>) => {
    setForm((prev) => {
      const merged = { ...prev, ...data }
      // If voice returned videos, stamp each with a stable id
      if (data.videos && data.videos.length > 0) {
        merged.videos = data.videos.map((v, i) => ({
          ...emptyVideo(`video-${videoCounter.current + i}`),
          ...v,
        }))
        videoCounter.current += data.videos.length
      }
      return merged
    })
  }, [])

  // --- submit ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client || !form.shootDate) return

    setSubmitState('submitting')
    setResult(null)

    try {
      const res = await fetch('/api/submit-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: form }),
      })
      const data: SubmitBriefResponse = await res.json()

      if (data.success) {
        setSubmitState('success')
        setResult(data)
        videoCounter.current = 2
        setForm({ ...emptyForm(), shootDate: today(), dateSent: today(), pipeline: form.pipeline })
        // Auto-open the ClickUp task in a new tab
        if (data.taskUrl) window.open(data.taskUrl, '_blank')
      } else {
        setSubmitState('error')
        setResult(data)
      }
    } catch {
      setSubmitState('error')
      setResult({ success: false, error: 'Network error — please try again.' })
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-10 text-brand-text">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 rounded-xl bg-brand-maroon px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-accent">
                Creative AI Media
              </p>
              <h1 className="text-2xl font-bold text-brand-offwhite">Editor Brief</h1>
              <p className="mt-1 text-sm text-brand-offwhite opacity-80">
                Fill in the details below and submit — a task will be created in ClickUp automatically.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-2 pt-1">
              <a
                href="/dashboard"
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-offwhite hover:bg-white/20 transition-colors"
              >
                Dashboard →
              </a>
              <a
                href="/clients"
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-offwhite hover:bg-white/20 transition-colors"
              >
                Client Profiles →
              </a>
            </div>
          </div>
        </div>

        {/* Success banner */}
        {submitState === 'success' && result?.briefUrl && (
          <SuccessBanner briefUrl={result.briefUrl} taskUrl={result.taskUrl} />
        )}

        {/* Error banner */}
        {submitState === 'error' && (
          <div className="mb-8 rounded-xl border border-red-700 bg-brand-maroon p-4 text-sm text-red-300">
            <p className="font-semibold">Submission failed.</p>
            <p className="mt-1 text-red-400">{result?.error}</p>
          </div>
        )}

        <VoiceButton onFill={handleVoiceFill} />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── PIPELINE SELECTOR ── */}
          <section className="rounded-xl bg-brand-surface p-6 shadow-sm border border-brand-border">
            <SectionHeading title="Select Pipeline" description="Where should this brief be sent?" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PIPELINES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setField('pipeline', p)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    form.pipeline === p
                      ? 'border-brand-maroon bg-brand-maroon text-brand-offwhite'
                      : 'border-brand-border bg-brand-surface-2 text-brand-text hover:border-brand-maroon'
                  }`}
                >
                  <p className="text-sm font-semibold">{p}</p>
                  <p className={`mt-1 text-xs ${form.pipeline === p ? 'text-brand-offwhite opacity-80' : 'text-brand-muted'}`}>
                    {PIPELINE_DESCRIPTIONS[p]}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* ── SECTION 1: Header ── */}
          <section className="rounded-xl bg-brand-surface p-6 shadow-sm border border-brand-border">
            <SectionHeading title="Brief Details" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                id="client"
                label="Client"
                value={form.client}
                options={CLIENTS}
                onChange={(v) => setField('client', v as BriefFormData['client'])}
                required
              />
              <SelectField
                id="platform"
                label="Platform"
                value={form.platform}
                options={PLATFORMS}
                onChange={(v) => setField('platform', v as BriefFormData['platform'])}
              />
              <TextField
                id="shootDate"
                label="Shoot Date"
                value={form.shootDate}
                onChange={(v) => setField('shootDate', v)}
                type="date"
                required
              />
              <TextField
                id="dateSent"
                label="Date Sent to Editor"
                value={form.dateSent}
                onChange={(v) => setField('dateSent', v)}
                type="date"
              />
              <SelectField
                id="briefFilledBy"
                label="Brief Filled By"
                value={form.briefFilledBy}
                options={TEAM_MEMBERS}
                onChange={(v) => setField('briefFilledBy', v)}
              />
              <TextField
                id="assignedEditor"
                label="Assigned Editor"
                value={form.assignedEditor}
                onChange={(v) => setField('assignedEditor', v)}
                placeholder="e.g. Mo, Sarah…"
              />
            </div>
            {form.client && (
              <ClientStylePanel
                client={form.client}
                profile={(clientProfiles[form.client] as Parameters<typeof ClientStylePanel>[0]['profile']) ?? null}
              />
            )}
          </section>

          {/* ── SECTION 2: Shoot Context ── */}
          <section className="rounded-xl bg-brand-surface p-6 shadow-sm border border-brand-border">
            <SectionHeading
              title="Shoot Context"
              description="Give the editor the full picture of what was captured."
            />
            <div className="space-y-4">
              <TextField
                id="clientBriefLink"
                label="Client Brief Link"
                value={form.clientBriefLink}
                onChange={(v) => setField('clientBriefLink', v)}
                placeholder="Link to the client brief doc (Google Docs, Notion, etc.)"
                type="url"
              />
              <TextField
                id="whatWasFilmed"
                label="What Was Filmed"
                value={form.whatWasFilmed}
                onChange={(v) => setField('whatWasFilmed', v)}
                placeholder="Describe what was shot — products, people, scenes…"
                multiline
                rows={3}
              />
              <TextField
                id="locationVibe"
                label="Location / Vibe"
                value={form.locationVibe}
                onChange={(v) => setField('locationVibe', v)}
                placeholder="e.g. Outdoor café, natural light, relaxed and warm vibe"
              />
              <TextField
                id="shootObjective"
                label="Shoot Objective"
                value={form.shootObjective}
                onChange={(v) => setField('shootObjective', v)}
                placeholder="What was the goal of this shoot overall?"
                multiline
                rows={2}
              />
            </div>
          </section>

          {/* ── SECTION 3: Funnel Stage ── */}
          <section className="rounded-xl bg-brand-surface p-6 shadow-sm border border-brand-border">
            <SectionHeading title="Funnel Stage" />
            <div className="space-y-3">
              <div className="flex gap-3">
                {FUNNEL_STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setField('funnelStage', stage)}
                    className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition-all ${
                      form.funnelStage === stage
                        ? 'border-brand-maroon bg-brand-maroon text-brand-accent'
                        : 'border-brand-border bg-brand-surface text-brand-text-dim hover:border-brand-maroon hover:text-brand-maroon'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
              {form.funnelStage && (
                <p className="rounded-lg border border-brand-border bg-brand-surface-2 px-4 py-3 text-sm text-brand-text-dim">
                  {FUNNEL_STAGE_DESCRIPTIONS[form.funnelStage]}
                </p>
              )}
            </div>
          </section>

          {/* ── SECTION 4: Videos ── */}
          <section className="rounded-xl bg-brand-surface-2 p-6 shadow-sm border border-brand-border">
            <SectionHeading
              title="Videos"
              description="Add one entry per deliverable. Each row becomes a separate brief for the editor."
            />
            <div className="space-y-4">
              {form.videos.map((video, i) => (
                <VideoRowCard
                  key={video.id}
                  video={video}
                  index={i}
                  onChange={updateVideo}
                  onRemove={removeVideo}
                  canRemove={form.videos.length > 1}
                />
              ))}
              <button
                type="button"
                onClick={addVideo}
                className="w-full rounded-xl border border-dashed border-brand-border bg-brand-surface py-3 text-sm text-brand-muted transition-colors hover:border-brand-maroon hover:text-brand-maroon"
              >
                + Add another video
              </button>
            </div>
          </section>

          {/* ── SECTION 5: General Instructions ── */}
          <section className="rounded-xl bg-brand-surface p-6 shadow-sm border border-brand-border">
            <SectionHeading
              title="General Instructions"
              description="Notes that apply across all videos in this brief."
            />
            <div className="space-y-4">
            <TextField
              id="referenceLinks"
              label="Reference Video Links"
              hint="Paste any reference videos for style, pacing, or format — one per line"
              value={form.referenceLinks}
              onChange={(v) => setField('referenceLinks', v)}
              placeholder={"https://...\nhttps://..."}
              multiline
              rows={3}
            />
            <TextField
              id="generalInstructions"
              label="Instructions"
              value={form.generalInstructions}
              onChange={(v) => setField('generalInstructions', v)}
              placeholder="Pacing preferences, colour grading notes, brand guidelines, anything else…"
              multiline
              rows={5}
            />
            </div>
          </section>

          {/* ── SUBMIT ── */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitState === 'submitting' || !form.pipeline || !form.client || !form.shootDate}
              className="w-full rounded-xl bg-brand-maroon px-6 py-3.5 text-sm font-semibold text-brand-accent transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitState === 'submitting' ? 'Submitting…' : 'Submit Brief to ClickUp'}
            </button>
            <p className="mt-3 text-center text-xs text-brand-muted">
              {form.pipeline
                ? `Submitting to: ${form.pipeline}`
                : 'Select a pipeline above before submitting.'}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
