'use client'

import { useState } from 'react'

export default function SubmitAssetButton({
  taskId,
  videoId,
  existingUrl,
}: {
  taskId: string
  videoId: string
  existingUrl?: string
}) {
  const [url, setUrl] = useState(existingUrl || '')
  const [open, setOpen] = useState(!existingUrl)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(!!existingUrl)

  const submit = async () => {
    if (!url.trim()) return
    setSaving(true)
    await fetch(`/api/brief/${taskId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, status: 'in-review', assetUrl: url.trim() }),
    })
    setSaving(false)
    setDone(true)
    setOpen(false)
  }

  if (done && !open) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-purple-900/30 border border-purple-400/20 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-300 mb-1">Final Asset Submitted</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-200 underline underline-offset-2 break-all hover:text-white"
          >
            {url}
          </a>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-shrink-0 text-[10px] text-purple-400 hover:text-white underline"
        >
          Update
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
        Submit Final Asset
      </p>
      <p className="text-xs text-white/40">Paste your Drive or Frame.io link — this marks the video as ready for review.</p>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/... or frame.io/..."
          className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-purple-400 focus:outline-none"
        />
        <button
          type="button"
          disabled={saving || !url.trim()}
          onClick={submit}
          className="flex-shrink-0 rounded-lg bg-purple-500 px-4 py-2 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Sending…' : 'Done →'}
        </button>
      </div>
    </div>
  )
}
