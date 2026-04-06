'use client'

import { useState } from 'react'
import { CLIENTS, VIDEO_FORMATS, TEAM_MEMBERS } from '@/lib/constants'
import type { ShootPrepInput } from '@/app/api/shoot-prep/route'

const EQUIPMENT_OPTIONS = [
  'Sony camera',
  'iPhone',
  'Gimbal',
  'Ring light',
  'Tripod',
  'Lavalier mic',
  'Shotgun mic',
  'Reflector',
  'ND filter',
  'Extra batteries',
  'Extra SD cards',
]

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#4f1c1e] focus:outline-none focus:ring-1 focus:ring-[#4f1c1e]'
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400'

interface PlannedVideo {
  id: string
  title: string
  concept: string
  format: string
  clientOnCamera: boolean
  keyMessages: string
  outfitNotes: string
  specificProps: string
}

function emptyVideo(id: string): PlannedVideo {
  return { id, title: '', concept: '', format: 'REEL', clientOnCamera: false, keyMessages: '', outfitNotes: '', specificProps: '' }
}

function uid() { return Math.random().toString(36).slice(2, 9) }

// Simple markdown renderer — bold, headings, lists
function MarkdownBlock({ md }: { md: string }) {
  const lines = md.split('\n')
  return (
    <div className="space-y-1 text-sm text-gray-700 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="mt-4 text-xs font-bold uppercase tracking-widest text-[#4f1c1e]">{line.slice(4)}</h3>
        if (line.startsWith('## ')) return <h2 key={i} className="mt-5 text-sm font-bold text-gray-900">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={i} className="mt-6 text-base font-bold text-gray-900">{line.slice(2)}</h1>
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: content }} />
        }
        if (/^\d+\. /.test(line)) {
          const content = line.replace(/^\d+\. /, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: content }} />
        }
        if (line.trim() === '' || line === '---') return <div key={i} className="h-2" />
        const content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        return <p key={i} dangerouslySetInnerHTML={{ __html: content }} />
      })}
    </div>
  )
}

export default function ShootPrepPage() {
  const [client, setClient] = useState<string>(CLIENTS[0])
  const [shootDate, setShootDate] = useState('')
  const [shooter, setShooter] = useState<string>(TEAM_MEMBERS[0])
  const [location, setLocation] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [generalObjective, setGeneralObjective] = useState('')
  const [equipment, setEquipment] = useState<string[]>(['Sony camera', 'iPhone', 'Gimbal', 'Lavalier mic'])
  const [customEquipment, setCustomEquipment] = useState('')
  const [videos, setVideos] = useState<PlannedVideo[]>([emptyVideo(uid())])
  const [clientContactName, setClientContactName] = useState('')
  const [additionalClientNotes, setAdditionalClientNotes] = useState('')

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ oliviaPack: string; clientDoc: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'olivia' | 'client'>('olivia')
  const [copied, setCopied] = useState<'olivia' | 'client' | null>(null)

  const toggleEquipment = (item: string) => {
    setEquipment((prev) => prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item])
  }

  const addVideo = () => setVideos((prev) => [...prev, emptyVideo(uid())])
  const removeVideo = (id: string) => setVideos((prev) => prev.filter((v) => v.id !== id))
  const updateVideo = (id: string, field: keyof PlannedVideo, value: string | boolean) => {
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, [field]: value } : v))
  }

  const handleGenerate = async () => {
    if (!client || !shootDate || !location || !generalObjective) return
    setGenerating(true)
    setError(null)
    setResult(null)

    const allEquipment = customEquipment.trim()
      ? [...equipment, ...customEquipment.split(',').map((e) => e.trim()).filter(Boolean)]
      : equipment

    const input: ShootPrepInput = {
      client,
      shootDate,
      shooter,
      location,
      locationAddress,
      generalObjective,
      equipment: allEquipment,
      plannedVideos: videos.map((v) => ({
        title: v.title || 'Untitled',
        concept: v.concept,
        format: v.format,
        clientOnCamera: v.clientOnCamera,
        keyMessages: v.keyMessages,
        outfitNotes: v.outfitNotes,
        specificProps: v.specificProps,
      })),
      clientContactName,
      additionalClientNotes,
    }

    try {
      const r = await fetch('/api/shoot-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await r.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
      setActiveTab('olivia')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const copyDoc = (which: 'olivia' | 'client') => {
    if (!result) return
    navigator.clipboard.writeText(which === 'olivia' ? result.oliviaPack : result.clientDoc)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-4 py-10 font-sans">
      <div className="mx-auto max-w-4xl space-y-5">

        {/* Header */}
        <div className="rounded-2xl bg-[#4f1c1e] px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#efff72]/70">Creative AI Media</p>
              <h1 className="text-2xl font-bold text-white">Shoot Day Prep</h1>
              <p className="mt-1 text-sm text-white/60">Generate Olivia's shoot pack and the client prep doc in one go.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <a href="/dashboard" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">Dashboard →</a>
              <a href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">New Brief →</a>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#4f1c1e]">Shoot Details</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Client</label>
              <select className={inputClass} value={client} onChange={(e) => setClient(e.target.value)}>
                {CLIENTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Shoot Date</label>
              <input type="date" className={inputClass} value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Shooter</label>
              <select className={inputClass} value={shooter} onChange={(e) => setShooter(e.target.value)}>
                {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Client Contact Name</label>
              <input className={inputClass} value={clientContactName} onChange={(e) => setClientContactName(e.target.value)} placeholder="e.g. Sarah (owner)" />
            </div>
            <div>
              <label className={labelClass}>Location / Venue Name</label>
              <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Rowanos Restaurant" />
            </div>
            <div>
              <label className={labelClass}>Address (optional)</label>
              <input className={inputClass} value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="e.g. 12 Smith St, Surry Hills" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Overall Shoot Objective</label>
              <textarea
                className={`${inputClass} resize-y`}
                rows={2}
                value={generalObjective}
                onChange={(e) => setGeneralObjective(e.target.value)}
                placeholder="What is this shoot trying to achieve? e.g. Build awareness for the new winter menu, showcase the kitchen team, drive bookings via Instagram"
              />
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className={labelClass}>Equipment Bringing</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EQUIPMENT_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleEquipment(item)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${equipment.includes(item) ? 'border-[#4f1c1e] bg-[#4f1c1e] text-[#efff72]' : 'border-gray-200 text-gray-600 hover:border-[#4f1c1e]'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              className={`${inputClass} mt-2`}
              value={customEquipment}
              onChange={(e) => setCustomEquipment(e.target.value)}
              placeholder="Other equipment (comma separated)"
            />
          </div>

          <div>
            <label className={labelClass}>Additional Notes for Client (optional)</label>
            <textarea
              className={`${inputClass} resize-y`}
              rows={2}
              value={additionalClientNotes}
              onChange={(e) => setAdditionalClientNotes(e.target.value)}
              placeholder="Anything specific the client should know or prepare that doesn't fit elsewhere"
            />
          </div>
        </div>

        {/* Planned Videos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Planned Content ({videos.length})</h2>
            <p className="text-xs text-gray-400">One card per deliverable video or content piece</p>
          </div>

          {videos.map((v, i) => (
            <div key={v.id} className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Content {i + 1}</span>
                {videos.length > 1 && (
                  <button onClick={() => removeVideo(v.id)} className="text-xs text-gray-300 hover:text-red-400">Remove</button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Title / Name</label>
                  <input
                    className={inputClass}
                    value={v.title}
                    onChange={(e) => updateVideo(v.id, 'title', e.target.value)}
                    placeholder='e.g. "Sources of the Week" or "Kitchen walkthrough reel"'
                  />
                </div>
                <div>
                  <label className={labelClass}>Format</label>
                  <select className={inputClass} value={v.format} onChange={(e) => updateVideo(v.id, 'format', e.target.value)}>
                    {VIDEO_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Concept / What It Needs to Look Like</label>
                  <textarea
                    className={`${inputClass} resize-y`}
                    rows={2}
                    value={v.concept}
                    onChange={(e) => updateVideo(v.id, 'concept', e.target.value)}
                    placeholder="Describe the vibe, shots needed, what story it tells, reference if relevant"
                  />
                </div>

                {/* Client on camera toggle */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => updateVideo(v.id, 'clientOnCamera', !v.clientOnCamera)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${v.clientOnCamera ? 'bg-[#4f1c1e]' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${v.clientOnCamera ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">Client appears on camera in this video</span>
                  </label>
                </div>

                {v.clientOnCamera && (
                  <>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Key Messages / Talking Points</label>
                      <textarea
                        className={`${inputClass} resize-y`}
                        rows={2}
                        value={v.keyMessages}
                        onChange={(e) => updateVideo(v.id, 'keyMessages', e.target.value)}
                        placeholder="What does the client need to get across? Not a script — just the ideas they need to communicate"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Outfit / Look Notes</label>
                      <input
                        className={inputClass}
                        value={v.outfitNotes}
                        onChange={(e) => updateVideo(v.id, 'outfitNotes', e.target.value)}
                        placeholder="e.g. Business casual, avoid white and busy patterns"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Props / Items to Have Ready</label>
                      <input
                        className={inputClass}
                        value={v.specificProps}
                        onChange={(e) => updateVideo(v.id, 'specificProps', e.target.value)}
                        placeholder="e.g. Menu, product samples, branded signage"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addVideo}
            className="w-full rounded-2xl border-2 border-dashed border-[#4f1c1e]/30 py-3.5 text-sm font-semibold text-[#4f1c1e] hover:border-[#4f1c1e] transition-colors"
          >
            + Add Content Piece
          </button>
        </div>

        {/* Generate */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !client || !shootDate || !location || !generalObjective}
          className="w-full rounded-2xl bg-[#4f1c1e] py-4 text-sm font-bold text-[#efff72] hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {generating ? 'Generating docs…' : 'Generate Shoot Pack + Client Doc'}
        </button>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Results */}
        {result && (
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('olivia')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'olivia' ? 'border-b-2 border-[#4f1c1e] text-[#4f1c1e]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Olivia's Shoot Pack
              </button>
              <button
                onClick={() => setActiveTab('client')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'client' ? 'border-b-2 border-[#4f1c1e] text-[#4f1c1e]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Client Prep Doc
              </button>
            </div>

            <div className="p-6">
              {/* Copy button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => copyDoc(activeTab)}
                  className="rounded-lg bg-[#4f1c1e] px-4 py-2 text-xs font-bold text-[#efff72] hover:opacity-90"
                >
                  {copied === activeTab ? 'Copied!' : `Copy ${activeTab === 'olivia' ? 'Shoot Pack' : 'Client Doc'}`}
                </button>
              </div>

              {activeTab === 'olivia' && <MarkdownBlock md={result.oliviaPack} />}
              {activeTab === 'client' && <MarkdownBlock md={result.clientDoc} />}
            </div>
          </div>
        )}

        {/* Drive structure reminder */}
        <div className="rounded-2xl bg-white border border-gray-200 px-5 py-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#4f1c1e]">Google Drive Folder Structure</h2>
          <p className="text-xs text-gray-500">Create this structure in the shared drive before uploading footage.</p>
          <pre className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600 whitespace-pre leading-relaxed overflow-x-auto">
{`[CLIENT NAME] /
  └── 2026 /
      └── [Month] /                     ← e.g. April
          ├── Camera Footage /
          │   ├── A-Roll /
          │   └── B-Roll /
          ├── Phone Footage /
          │   ├── A-Roll /
          │   └── B-Roll /
          └── [Specific Reel Name] /     ← e.g. "Sources of the Week"
              └── [clips for that reel only]`}
          </pre>
          <ul className="space-y-1 text-xs text-gray-500">
            <li className="flex gap-2"><span className="text-[#4f1c1e] font-bold">A-Roll</span> = main footage (talking heads, hero shots, interviews)</li>
            <li className="flex gap-2"><span className="text-[#4f1c1e] font-bold">B-Roll</span> = cutaways, environment, product detail, movement shots</li>
            <li className="flex gap-2"><span className="text-[#4f1c1e] font-bold">Named folders</span> = specific reels where you know exactly which clips belong to that video — link this folder directly in the brief</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
