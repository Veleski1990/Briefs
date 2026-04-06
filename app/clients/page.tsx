'use client'

import { useState, useEffect, useCallback } from 'react'
import { CLIENTS } from '@/lib/constants'

interface ClientProfile {
  musicStyle: string
  editingPace: string
  colourCodes: string
  fonts: string
  textStyleImageUrl: string
  dos: string[]
  donts: string[]
  generalNotes: string
}

type AllProfiles = Record<string, ClientProfile>

function emptyProfile(): ClientProfile {
  return {
    musicStyle: '',
    editingPace: '',
    colourCodes: '',
    fonts: '',
    textStyleImageUrl: '',
    dos: [],
    donts: [],
    generalNotes: '',
  }
}

export default function ClientsPage() {
  const [profiles, setProfiles] = useState<AllProfiles>({})
  const [selected, setSelected] = useState<string>(CLIENTS[0])
  const [form, setForm] = useState<ClientProfile>(emptyProfile())
  const [dosInput, setDosInput] = useState('')
  const [dontsInput, setDontsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Read ?edit=ClientName from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const edit = params.get('edit')
    if (edit && CLIENTS.includes(edit as typeof CLIENTS[number])) {
      setSelected(edit)
    }
  }, [])

  useEffect(() => {
    fetch('/api/client-profiles')
      .then((r) => r.json())
      .then((data) => setProfiles(data))
  }, [])

  useEffect(() => {
    const p = profiles[selected]
    if (p) {
      setForm(p)
      setDosInput(p.dos.join('\n'))
      setDontsInput(p.donts.join('\n'))
    } else {
      setForm(emptyProfile())
      setDosInput('')
      setDontsInput('')
    }
  }, [selected, profiles])

  const setField = (key: keyof ClientProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    const profile: ClientProfile = {
      ...form,
      dos: dosInput.split('\n').map((s) => s.trim()).filter(Boolean),
      donts: dontsInput.split('\n').map((s) => s.trim()).filter(Boolean),
    }
    await fetch('/api/client-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: selected, profile }),
    })
    setProfiles((prev) => ({ ...prev, [selected]: profile }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }, [form, dosInput, dontsInput, selected])

  const inputClass =
    'w-full rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-text placeholder-brand-taupe focus:border-brand-maroon focus:outline-none focus:ring-1 focus:ring-brand-maroon transition-colors'

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-10 text-brand-text">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 rounded-xl bg-brand-maroon px-6 py-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Creative AI Media
          </p>
          <h1 className="font-heading text-4xl text-brand-offwhite">Client Style Guides</h1>
          <p className="mt-1 text-sm text-brand-offwhite opacity-80">
            Set the persistent style preferences for each client. These load automatically when filling a brief.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {/* Client list */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-3 shadow-sm sm:col-span-1">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-widest text-brand-muted">Clients</p>
            <ul className="space-y-0.5">
              {CLIENTS.map((c) => {
                const hasProfile = profiles[c] && (
                  profiles[c].musicStyle || profiles[c].generalNotes || profiles[c].dos.length > 0
                )
                return (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`w-full rounded-lg px-2 py-2 text-left text-xs font-medium transition-all ${
                        selected === c
                          ? 'bg-brand-maroon text-brand-accent'
                          : 'text-brand-text hover:bg-brand-surface-2'
                      }`}
                    >
                      <span>{c}</span>
                      {hasProfile && <span className="ml-1 text-green-500">•</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Profile editor */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-sm sm:col-span-3">
            <div className="mb-5 border-b border-brand-border pb-3">
              <h2 className="text-base font-semibold text-brand-dark">{selected}</h2>
              <p className="text-xs text-brand-muted">Style preferences for the editor</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                  Music Style
                </label>
                <input
                  className={inputClass}
                  value={form.musicStyle}
                  onChange={(e) => setField('musicStyle', e.target.value)}
                  placeholder="e.g. Upbeat indie, no lyrics, 90-120 BPM"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                  Editing Pace
                </label>
                <input
                  className={inputClass}
                  value={form.editingPace}
                  onChange={(e) => setField('editingPace', e.target.value)}
                  placeholder="e.g. Fast cuts on beat, max 2s per clip"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                  Colour Codes
                </label>
                <input
                  className={inputClass}
                  value={form.colourCodes}
                  onChange={(e) => setField('colourCodes', e.target.value)}
                  placeholder="e.g. Primary #4f1c1e · Accent #efff72 · White #ffffff"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                  Fonts / Text Style
                </label>
                <input
                  className={inputClass}
                  value={form.fonts}
                  onChange={(e) => setField('fonts', e.target.value)}
                  placeholder="e.g. Bold sans-serif, white text, lower thirds only"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                  Text Style Reference Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text file:mr-3 file:rounded-md file:border-0 file:bg-brand-maroon file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-accent cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => setField('textStyleImageUrl', reader.result as string)
                    reader.readAsDataURL(file)
                  }}
                />
                {form.textStyleImageUrl && (
                  <div className="mt-2 relative">
                    <img
                      src={form.textStyleImageUrl}
                      alt="Text style reference"
                      className="max-h-48 w-full rounded-lg border border-brand-border object-contain bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setField('textStyleImageUrl', '')}
                      className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white hover:bg-black/70"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                    Do's <span className="normal-case font-normal">(one per line)</span>
                  </label>
                  <textarea
                    className={`${inputClass} resize-y`}
                    rows={4}
                    value={dosInput}
                    onChange={(e) => setDosInput(e.target.value)}
                    placeholder={"Always show product close-up\nUse brand colours in overlays"}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                    Don'ts <span className="normal-case font-normal">(one per line)</span>
                  </label>
                  <textarea
                    className={`${inputClass} resize-y`}
                    rows={4}
                    value={dontsInput}
                    onChange={(e) => setDontsInput(e.target.value)}
                    placeholder={"No jump cuts\nDon't use competitor colours"}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                  General Notes
                </label>
                <textarea
                  className={`${inputClass} resize-y`}
                  rows={3}
                  value={form.generalNotes}
                  onChange={(e) => setField('generalNotes', e.target.value)}
                  placeholder="Anything else the editor should always know about this client…"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-brand-maroon px-6 py-2.5 text-sm font-semibold text-brand-accent hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving…' : 'Save Style Guide'}
              </button>
              {saved && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-brand-muted underline hover:text-brand-maroon">
            ← Back to brief form
          </a>
        </div>
      </div>
    </div>
  )
}
