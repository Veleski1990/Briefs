'use client'

import { useState } from 'react'
import { VIDEO_FORMATS } from '@/lib/constants'
import type { VideoRow } from '@/lib/types'
import SelectField from './SelectField'
import TextField from './TextField'

interface VideoRowCardProps {
  video: VideoRow
  index: number
  onChange: (id: string, field: keyof VideoRow, value: string) => void
  onChangeContentLinks: (id: string, links: Array<{ url: string; notes?: string }>) => void
  onRemove: (id: string) => void
  canRemove: boolean
}

// Formats where Hook + content links are relevant
const VIDEO_ONLY_FORMATS = new Set(['REEL', 'SHORT-FORM', 'VSL', 'STORY'])

function ContentLinks({
  label,
  links,
  onChange,
  videoId,
}: {
  label: string
  links: Array<{ url: string; notes?: string }>
  onChange: (next: Array<{ url: string; notes?: string }>) => void
  videoId: string
}) {
  const rows = links.length > 0 ? links : [{ url: '', notes: '' }]

  const updateRow = (i: number, patch: Partial<{ url: string; notes: string }>) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, ...patch } : r)
    onChange(next.filter(r => r.url.trim() || r.notes?.trim()))
  }

  const addRow = () => onChange([...rows, { url: '', notes: '' }])

  const removeRow = (i: number) => {
    const next = rows.filter((_, idx) => idx !== i)
    onChange(next)
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-muted">
        {label}
      </label>
      <p className="mb-2 text-xs text-brand-muted">Paste a link and add any notes about it (e.g. what the footage covers).</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={`${videoId}-content-${i}`} className="rounded-lg border border-brand-border bg-white p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={row.url}
                onChange={(e) => updateRow(i, { url: e.target.value })}
                placeholder="Drive / Frame.io URL"
                className="flex-1 rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text placeholder-brand-taupe focus:border-brand-maroon focus:outline-none focus:ring-1 focus:ring-brand-maroon transition-colors"
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="flex-shrink-0 text-xs text-brand-muted hover:text-red-500 transition-colors px-1"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              type="text"
              value={row.notes ?? ''}
              onChange={(e) => updateRow(i, { notes: e.target.value })}
              placeholder="Notes (optional) — e.g. hero shot of kitchen, main hook footage…"
              className="w-full rounded-lg border border-brand-border bg-brand-surface-2 px-3 py-1.5 text-xs text-brand-text placeholder-brand-taupe focus:border-brand-maroon focus:outline-none transition-colors"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="text-xs text-brand-muted hover:text-brand-maroon transition-colors"
        >
          + Add another link
        </button>
      </div>
    </div>
  )
}

export default function VideoRowCard({
  video,
  index,
  onChange,
  onChangeContentLinks,
  onRemove,
  canRemove,
}: VideoRowCardProps) {
  const [showOptional, setShowOptional] = useState(false)
  const update = (field: keyof VideoRow) => (value: string) =>
    onChange(video.id, field, value)

  const isVideoFormat = !video.format || VIDEO_ONLY_FORMATS.has(video.format)

  return (
    <div className="relative rounded-xl border border-brand-border bg-brand-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-maroon">
          Video {index + 1}{video.format ? ` — ${video.format}` : ''}
        </h3>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(video.id)}
            className="text-xs text-brand-muted hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Always visible: Format / Duration / Deadline */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField
          id={`format-${video.id}`}
          label="Format"
          value={video.format}
          options={VIDEO_FORMATS}
          onChange={update('format')}
          required
        />
        <TextField
          id={`duration-${video.id}`}
          label="Duration"
          value={video.duration}
          onChange={update('duration')}
          placeholder="e.g. 30s, 60s, 3min"
        />
        <TextField
          id={`deadline-${video.id}`}
          label="Deadline"
          value={video.deadline}
          onChange={update('deadline')}
          type="date"
        />
      </div>

      {/* Always visible: Angle */}
      <div className="mt-4">
        <TextField
          id={`angle-${video.id}`}
          label="Angle / Objective"
          value={video.angleObjective}
          onChange={update('angleObjective')}
          placeholder="What is this video trying to achieve?"
        />
      </div>

      {/* Video formats only: Hook */}
      {isVideoFormat && (
        <div className="mt-4">
          <TextField
            id={`hook-${video.id}`}
            label="What should the video say in the first 10 seconds"
            value={video.hook}
            onChange={update('hook')}
            placeholder="Describe exactly what should happen or be said in the opening — this hooks the viewer"
          />
        </div>
      )}

      {/* Content links — unified for all formats */}
      <div className="mt-4">
        <ContentLinks
          label={isVideoFormat ? 'Content Link' : 'Content / Assets'}
          links={video.contentLinks ?? []}
          onChange={(next) => onChangeContentLinks(video.id, next)}
          videoId={video.id}
        />
      </div>

      {/* Optional fields toggle */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="text-xs font-semibold text-brand-muted hover:text-brand-maroon transition-colors"
        >
          {showOptional ? '− Hide optional fields' : '+ Script, music, overlays, notes'}
        </button>
      </div>

      {showOptional && (
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id={`script-${video.id}`}
              label="Script Link"
              value={video.scriptLink}
              onChange={update('scriptLink')}
              placeholder="Docs / Notion URL"
              type="url"
            />
            <TextField
              id={`music-${video.id}`}
              label="Music Link"
              value={video.musicLink}
              onChange={update('musicLink')}
              placeholder="Spotify / SoundCloud URL"
              type="url"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id={`overlays-${video.id}`}
              label="Text Overlays"
              value={video.textOverlays}
              onChange={update('textOverlays')}
              placeholder="Any on-screen text, captions, CTAs…"
              multiline
              rows={2}
            />
            <TextField
              id={`notes-${video.id}`}
              label="Special Notes"
              value={video.specialNotes}
              onChange={update('specialNotes')}
              placeholder="Anything the editor needs to know…"
              multiline
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  )
}
