'use client'

import { useState, useEffect, useCallback } from 'react'

interface ClientProfile {
  musicStyle: string
  editingPace: string
  colourCodes: string
  captionFont: string
  captionFontImageUrl: string
  overlayFont: string
  overlayFontImageUrl: string
  logoUrl: string
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
    captionFont: '',
    captionFontImageUrl: '',
    overlayFont: '',
    overlayFontImageUrl: '',
    logoUrl: '',
    dos: [],
    donts: [],
    generalNotes: '',
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<string[]>([])
  const [profiles, setProfiles] = useState<AllProfiles>({})
  const [selected, setSelected] = useState<string>('')
  const [form, setForm] = useState<ClientProfile>(emptyProfile())
  const [dosInput, setDosInput] = useState('')
  const [dontsInput, setDontsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((list: string[]) => {
        setClients(list)
        // Read ?edit=ClientName from URL or default to first
        const params = new URLSearchParams(window.location.search)
        const edit = params.get('edit')
        setSelected(edit && list.includes(edit) ? edit : list[0] ?? '')
      })
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

  const addClient = async () => {
    const name = newClientName.trim()
    if (!name) return
    setAddingClient(true)
    setAddError('')
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) {
      setAddError(data.error ?? 'Failed to add client')
      setAddingClient(false)
      return
    }
    setClients(data.clients)
    setSelected(name.trim().toUpperCase())
    setNewClientName('')
    setAddingClient(false)
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
          <div className="rounded-xl border border-brand-border bg-brand-surface p-3 shadow-sm sm:col-span-1 self-start">
            <p className="px-2 text-xs font-semibold uppercase tracking-widest text-brand-muted">Clients</p>
            <ul className="space-y-0.5 mb-1">
              {clients.map((c) => {
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

            {/* Add new client */}
            <div className="border-t border-brand-border pt-2 space-y-1.5">
              <input
                type="text"
                value={newClientName}
                onChange={(e) => { setNewClientName(e.target.value); setAddError('') }}
                onKeyDown={(e) => e.key === 'Enter' && addClient()}
                placeholder="New client name…"
                className="w-full rounded-lg border border-brand-border bg-white px-2 py-1.5 text-xs text-brand-text placeholder-brand-muted focus:border-brand-maroon focus:outline-none"
              />
              {addError && <p className="text-[10px] text-red-500">{addError}</p>}
              <button
                type="button"
                onClick={addClient}
                disabled={addingClient || !newClientName.trim()}
                className="w-full rounded-lg bg-brand-maroon px-2 py-1.5 text-xs font-semibold text-brand-accent hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {addingClient ? 'Adding…' : '+ Add Client'}
              </button>
            </div>
          </div>

          {/* Profile editor */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-sm sm:col-span-3">
            <div className="mb-5 border-b border-brand-border pb-3">
              <h2 className="text-base font-semibold text-brand-dark">{selected}</h2>
              <p className="text-xs text-brand-muted">Style preferences for the editor</p>
            </div>

            <div className="space-y-4">
              {/* Brand Logo */}
              <div className="rounded-lg border border-brand-border bg-brand-surface-2 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">Brand Logo</p>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text file:mr-3 file:rounded-md file:border-0 file:bg-brand-maroon file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-accent cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => setField('logoUrl', reader.result as string)
                    reader.readAsDataURL(file)
                  }}
                />
                {form.logoUrl && (
                  <div className="relative flex items-start gap-4">
                    <img
                      src={form.logoUrl}
                      alt="Brand logo"
                      className="max-h-24 max-w-[200px] rounded-lg border border-brand-border object-contain bg-white p-2"
                    />
                    <div className="flex flex-col gap-2">
                      <a
                        href={form.logoUrl}
                        download={`${selected.toLowerCase().replace(/\s+/g, '-')}-logo`}
                        className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-semibold text-brand-text hover:border-brand-maroon hover:text-brand-maroon transition-colors"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => setField('logoUrl', '')}
                        className="rounded-lg border border-brand-border px-3 py-1.5 text-xs text-brand-muted hover:border-red-300 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
              {/* Caption font */}
              <div className="rounded-lg border border-brand-border bg-brand-surface-2 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">Caption Font (Subtitles)</p>
                <input
                  className={inputClass}
                  value={form.captionFont}
                  onChange={(e) => setField('captionFont', e.target.value)}
                  placeholder="e.g. ZY Resolve Caps, white, all-caps"
                />
                <div>
                  <label className="mb-1.5 block text-xs text-brand-muted">Reference image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text file:mr-3 file:rounded-md file:border-0 file:bg-brand-maroon file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-accent cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => setField('captionFontImageUrl', reader.result as string)
                      reader.readAsDataURL(file)
                    }}
                  />
                  {form.captionFontImageUrl && (
                    <div className="mt-2 relative">
                      <img src={form.captionFontImageUrl} alt="Caption font reference" className="max-h-40 w-full rounded-lg border border-brand-border object-contain bg-gray-50" />
                      <button type="button" onClick={() => setField('captionFontImageUrl', '')}
                        className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white hover:bg-black/70">Remove</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Overlay font */}
              <div className="rounded-lg border border-brand-border bg-brand-surface-2 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">Text Overlay Font</p>
                <input
                  className={inputClass}
                  value={form.overlayFont}
                  onChange={(e) => setField('overlayFont', e.target.value)}
                  placeholder="e.g. Bebas Neue, yellow, bold — used for on-screen text and CTAs"
                />
                <div>
                  <label className="mb-1.5 block text-xs text-brand-muted">Reference image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text file:mr-3 file:rounded-md file:border-0 file:bg-brand-maroon file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-accent cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => setField('overlayFontImageUrl', reader.result as string)
                      reader.readAsDataURL(file)
                    }}
                  />
                  {form.overlayFontImageUrl && (
                    <div className="mt-2 relative">
                      <img src={form.overlayFontImageUrl} alt="Overlay font reference" className="max-h-40 w-full rounded-lg border border-brand-border object-contain bg-gray-50" />
                      <button type="button" onClick={() => setField('overlayFontImageUrl', '')}
                        className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white hover:bg-black/70">Remove</button>
                    </div>
                  )}
                </div>
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
