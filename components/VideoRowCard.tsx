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
  onRemove: (id: string) => void
  canRemove: boolean
}

// Formats where Hook + A-Roll/B-Roll are relevant
const VIDEO_ONLY_FORMATS = new Set(['REEL', 'SHORT-FORM', 'VSL', 'STORY'])

function FootageLinks({
  label,
  value,
  onChange,
  videoId,
  fieldKey,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  videoId: string
  fieldKey: string
}) {
  const [links, setLinks] = useState<string[]>(() => {
    const parsed = (value || '').split('\n').map((l) => l.trim()).filter(Boolean)
    return parsed.length > 0 ? parsed : ['']
  })

  const updateLink = (i: number, val: string) => {
    const next = [...links]
    next[i] = val
    setLinks(next)
    onChange(next.filter(Boolean).join('\n'))
  }

  const addLink = () => setLinks((prev) => [...prev, ''])

  const removeLink = (i: number) => {
    const next = links.filter((_, idx) => idx !== i)
    const safe = next.length > 0 ? next : ['']
    setLinks(safe)
    onChange(safe.filter(Boolean).join('\n'))
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-muted">
        {label}
      </label>
      <div className="space-y-1.5">
        {links.map((link, i) => (
          <div key={`${videoId}-${fieldKey}-${i}`} className="flex items-center gap-1.5">
            <input
              type="url"
              value={link}
              onChange={(e) => updateLink(i, e.target.value)}
              placeholder="Drive / Frame.io URL"
              className="flex-1 rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text placeholder-brand-taupe focus:border-brand-maroon focus:outline-none focus:ring-1 focus:ring-brand-maroon transition-colors"
            />
            {links.length > 1 && (
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="flex-shrink-0 text-xs text-brand-muted hover:text-red-400 transition-colors px-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addLink}
          className="text-xs text-brand-muted hover:text-brand-maroon transition-colors"
        >
          + Add link
        </button>
      </div>
    </div>
  )
}

export default function VideoRowCard({
  video,
  index,
  onChange,
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

      {/* Video formats only: Hook + Footage */}
      {isVideoFormat && (
        <>
          <div className="mt-4">
            <TextField
              id={`hook-${video.id}`}
              label="Hook (First 3 Seconds)"
              value={video.hook}
              onChange={update('hook')}
              placeholder="Describe exactly what should happen in the opening seconds"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FootageLinks
              label="A-Roll Footage"
              value={video.aRollLinks || ''}
              onChange={update('aRollLinks')}
              videoId={video.id}
              fieldKey="aroll"
            />
            <FootageLinks
              label="B-Roll Footage"
              value={video.bRollLinks || ''}
              onChange={update('bRollLinks')}
              videoId={video.id}
              fieldKey="broll"
            />
          </div>
        </>
      )}

      {/* Static/Carousel: just a single footage field */}
      {!isVideoFormat && (
        <div className="mt-4">
          <FootageLinks
            label="Footage / Assets"
            value={video.aRollLinks || ''}
            onChange={update('aRollLinks')}
            videoId={video.id}
            fieldKey="aroll"
          />
        </div>
      )}

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
