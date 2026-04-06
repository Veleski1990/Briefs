'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  CLIENTS, PLATFORMS, PIPELINES, PIPELINE_DESCRIPTIONS,
  FUNNEL_STAGES, FUNNEL_STAGE_DESCRIPTIONS, TEAM_MEMBERS,
} from '@/lib/constants'
import type { BriefFormData, VideoRow, StoredBrief } from '@/lib/types'

function emptyVideo(id: string): VideoRow {
  return { id, format: '', duration: '', angleObjective: '', hook: '', aRollLinks: '', bRollLinks: '', scriptLink: '', musicLink: '', textOverlays: '', specialNotes: '', deadline: '' }
}

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#4f1c1e] focus:outline-none focus:ring-1 focus:ring-[#4f1c1e] transition-colors'
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-gray-400'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelClass}>{label}</label>{children}</div>
}

function FootageLinks({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  const [links, setLinks] = useState<string[]>(() => {
    const parsed = (value || '').split('\n').map((l) => l.trim()).filter(Boolean)
    return parsed.length > 0 ? parsed : ['']
  })

  const update = (i: number, val: string) => {
    const next = [...links]; next[i] = val
    setLinks(next)
    onChange(next.filter(Boolean).join('\n'))
  }
  const add = () => setLinks((prev) => [...prev, ''])
  const remove = (i: number) => {
    const next = links.filter((_, idx) => idx !== i)
    const safe = next.length > 0 ? next : ['']
    setLinks(safe)
    onChange(safe.filter(Boolean).join('\n'))
  }

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-1.5">
        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input type="url" className={inputClass} value={link} onChange={(e) => update(i, e.target.value)} placeholder="Drive / Frame.io URL" />
            {links.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="text-xs text-gray-400 hover:text-red-400 px-1">✕</button>
            )}
          </div>
        ))}
        <button type="button" onClick={add} className="text-xs text-gray-400 hover:text-[#4f1c1e] transition-colors">+ Add link</button>
      </div>
    </div>
  )
}

export default function BriefEditForm({ taskId, stored }: { taskId: string; stored: StoredBrief }) {
  const router = useRouter()
  const [form, setForm] = useState<BriefFormData>(stored.brief)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const videoCounter = useRef(stored.brief.videos.length + 1)

  const setField = useCallback(<K extends keyof BriefFormData>(key: K, value: BriefFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const addVideo = () => {
    const id = `video-${videoCounter.current++}`
    setForm((prev) => ({ ...prev, videos: [...prev.videos, emptyVideo(id)] }))
  }

  const removeVideo = (id: string) => {
    setForm((prev) => ({ ...prev, videos: prev.videos.filter((v) => v.id !== id) }))
  }

  const updateVideo = (id: string, field: keyof VideoRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      videos: prev.videos.map((v) => v.id === id ? { ...v, [field]: value } : v),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/brief/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: form }),
      })
      if (!res.ok) throw new Error('Save failed')
      router.push(`/brief/${taskId}`)
      router.refresh()
    } catch {
      setError('Something went wrong — please try again.')
      setSaving(false)
    }
  }

  const VIDEO_FORMATS = ['REEL', 'VSL', 'SHORT-FORM', 'CAROUSEL', 'STATIC', 'STORY'] as const

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-4 py-10 font-sans">
      <div className="mx-auto max-w-3xl space-y-4">

        {/* Header */}
        <div className="rounded-2xl bg-[#4f1c1e] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#efff72]/70">Edit Brief</p>
              <h1 className="text-2xl font-bold text-white">{form.client || 'Brief'}</h1>
              <p className="mt-1 text-sm text-white/60">Changes save back to the brief page and update ClickUp.</p>
            </div>
            <a
              href={`/brief/${taskId}`}
              className="mt-1 flex-shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              ← Back
            </a>
          </div>
        </div>

        {/* Pipeline */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Pipeline</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PIPELINES.map((p) => (
              <button
                key={p} type="button" onClick={() => setField('pipeline', p)}
                className={`rounded-xl border p-3 text-left transition-all ${form.pipeline === p ? 'border-[#4f1c1e] bg-[#4f1c1e] text-white' : 'border-gray-200 hover:border-[#4f1c1e] text-gray-700'}`}
              >
                <p className="text-sm font-semibold">{p}</p>
                <p className={`mt-0.5 text-xs ${form.pipeline === p ? 'text-white/70' : 'text-gray-400'}`}>{PIPELINE_DESCRIPTIONS[p]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Brief Details */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Brief Details</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Client">
              <select className={inputClass} value={form.client} onChange={(e) => setField('client', e.target.value as BriefFormData['client'])}>
                <option value="">Select client…</option>
                {CLIENTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Platform">
              <select className={inputClass} value={form.platform} onChange={(e) => setField('platform', e.target.value as BriefFormData['platform'])}>
                <option value="">Select platform…</option>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Shoot Date">
              <input type="date" className={inputClass} value={form.shootDate} onChange={(e) => setField('shootDate', e.target.value)} />
            </Field>
            <Field label="Date Sent">
              <input type="date" className={inputClass} value={form.dateSent} onChange={(e) => setField('dateSent', e.target.value)} />
            </Field>
            <Field label="Brief Filled By">
              <select className={inputClass} value={form.briefFilledBy} onChange={(e) => setField('briefFilledBy', e.target.value)}>
                <option value="">Select…</option>
                {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Assigned Editor">
              <input className={inputClass} value={form.assignedEditor || ''} onChange={(e) => setField('assignedEditor', e.target.value)} placeholder="e.g. Mo, Sarah…" />
            </Field>
          </div>
        </div>

        {/* Shoot Context */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Shoot Context</p>
          <Field label="Client Brief Link">
            <input type="url" className={inputClass} value={form.clientBriefLink} onChange={(e) => setField('clientBriefLink', e.target.value)} placeholder="Google Docs, Notion, etc." />
          </Field>
          <Field label="What Was Filmed">
            <textarea className={`${inputClass} resize-y`} rows={3} value={form.whatWasFilmed} onChange={(e) => setField('whatWasFilmed', e.target.value)} />
          </Field>
          <Field label="Location / Vibe">
            <input className={inputClass} value={form.locationVibe} onChange={(e) => setField('locationVibe', e.target.value)} />
          </Field>
          <Field label="Shoot Objective">
            <textarea className={`${inputClass} resize-y`} rows={2} value={form.shootObjective} onChange={(e) => setField('shootObjective', e.target.value)} />
          </Field>
        </div>

        {/* Funnel Stage */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Funnel Stage</p>
          <div className="flex gap-3">
            {FUNNEL_STAGES.map((stage) => (
              <button
                key={stage} type="button" onClick={() => setField('funnelStage', stage)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${form.funnelStage === stage ? 'border-[#4f1c1e] bg-[#4f1c1e] text-[#efff72]' : 'border-gray-200 text-gray-500 hover:border-[#4f1c1e]'}`}
              >
                {stage}
              </button>
            ))}
          </div>
          {form.funnelStage && (
            <p className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {FUNNEL_STAGE_DESCRIPTIONS[form.funnelStage]}
            </p>
          )}
        </div>

        {/* Videos */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Videos</p>
          {form.videos.map((video, i) => (
            <div key={video.id} className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between bg-[#4f1c1e] px-4 py-3">
                <span className="text-sm font-bold text-[#efff72]">Video {i + 1}</span>
                {form.videos.length > 1 && (
                  <button type="button" onClick={() => removeVideo(video.id)} className="text-xs text-white/50 hover:text-white">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                <Field label="Format">
                  <select className={inputClass} value={video.format} onChange={(e) => updateVideo(video.id, 'format', e.target.value)}>
                    <option value="">Select…</option>
                    {VIDEO_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Duration">
                  <input className={inputClass} value={video.duration} onChange={(e) => updateVideo(video.id, 'duration', e.target.value)} placeholder="e.g. 30s" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Angle / Objective">
                    <textarea className={`${inputClass} resize-y`} rows={2} value={video.angleObjective} onChange={(e) => updateVideo(video.id, 'angleObjective', e.target.value)} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Hook (first 3s)">
                    <input className={inputClass} value={video.hook} onChange={(e) => updateVideo(video.id, 'hook', e.target.value)} />
                  </Field>
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FootageLinks label="A-Roll Footage" value={video.aRollLinks || ''} onChange={(val) => updateVideo(video.id, 'aRollLinks', val)} />
                  <FootageLinks label="B-Roll Footage" value={video.bRollLinks || ''} onChange={(val) => updateVideo(video.id, 'bRollLinks', val)} />
                </div>
                <Field label="Script Link">
                  <input type="url" className={inputClass} value={video.scriptLink} onChange={(e) => updateVideo(video.id, 'scriptLink', e.target.value)} />
                </Field>
                <Field label="Music Link">
                  <input type="url" className={inputClass} value={video.musicLink} onChange={(e) => updateVideo(video.id, 'musicLink', e.target.value)} />
                </Field>
                <Field label="Deadline">
                  <input type="date" className={inputClass} value={video.deadline} onChange={(e) => updateVideo(video.id, 'deadline', e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Text Overlays">
                    <input className={inputClass} value={video.textOverlays} onChange={(e) => updateVideo(video.id, 'textOverlays', e.target.value)} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Special Notes">
                    <textarea className={`${inputClass} resize-y`} rows={2} value={video.specialNotes} onChange={(e) => updateVideo(video.id, 'specialNotes', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button" onClick={addVideo}
            className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-400 hover:border-[#4f1c1e] hover:text-[#4f1c1e] transition-colors"
          >
            + Add another video
          </button>
        </div>

        {/* General Instructions */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">General Instructions</p>
          <Field label="Reference Video Links">
            <textarea className={`${inputClass} resize-y`} rows={3} value={form.referenceLinks} onChange={(e) => setField('referenceLinks', e.target.value)} placeholder={'https://...\nhttps://...'} />
          </Field>
          <Field label="Instructions">
            <textarea className={`${inputClass} resize-y`} rows={4} value={form.generalInstructions} onChange={(e) => setField('generalInstructions', e.target.value)} />
          </Field>
        </div>

        {/* Save */}
        {error && <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</p>}
        <div className="pb-4">
          <button
            type="button" onClick={handleSave} disabled={saving}
            className="w-full rounded-2xl bg-[#4f1c1e] px-6 py-4 text-sm font-bold text-[#efff72] hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">
            This will update the brief page and sync to ClickUp.
          </p>
        </div>

      </div>
    </div>
  )
}
