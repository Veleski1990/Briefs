'use client'

import { useState } from 'react'
import type { BriefStatus } from '@/lib/types'

// Bulk action bar — marks every video to the same status in one tap
export function BulkStatusBar({
  taskId,
  videoIds,
}: {
  taskId: string
  videoIds: string[]
}) {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const markAll = async (status: BriefStatus) => {
    if (saving || videoIds.length === 0) return
    setSaving(true)
    await Promise.all(
      videoIds.map((videoId) =>
        fetch(`/api/brief/${taskId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, status }),
        })
      )
    )
    setSaving(false)
    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-white/50 font-semibold uppercase tracking-widest">Mark all:</span>
      {STATUSES.map((s) => (
        <button
          key={s.value}
          type="button"
          disabled={saving}
          onClick={() => markAll(s.value)}
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all disabled:opacity-50 ${s.colour}`}
        >
          {s.label}
        </button>
      ))}
      {saving && <span className="text-[10px] text-white/50">Saving…</span>}
      {done && !saving && <span className="text-[10px] text-green-400">All updated ✓</span>}
    </div>
  )
}

export const STATUSES: {
  value: BriefStatus
  label: string
  colour: string
  active: string
  dot: string
}[] = [
  {
    value: 'not-started',
    label: 'Not Started',
    colour: 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400',
    active: 'border-gray-500 bg-gray-500 text-white shadow',
    dot: 'bg-gray-400',
  },
  {
    value: 'in-edit',
    label: 'In Edit',
    colour: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400',
    active: 'border-blue-500 bg-blue-500 text-white shadow',
    dot: 'bg-blue-500',
  },
  {
    value: 'amendments',
    label: 'Amendments',
    colour: 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400',
    active: 'border-orange-500 bg-orange-500 text-white shadow',
    dot: 'bg-orange-500',
  },
  {
    value: 'in-review',
    label: 'In Review',
    colour: 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400',
    active: 'border-purple-500 bg-purple-500 text-white shadow',
    dot: 'bg-purple-500',
  },
  {
    value: 'approved',
    label: 'Approved',
    colour: 'border-green-200 bg-green-50 text-green-700 hover:border-green-400',
    active: 'border-green-500 bg-green-500 text-white shadow',
    dot: 'bg-green-500',
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    colour: 'border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-400',
    active: 'border-teal-500 bg-teal-500 text-white shadow',
    dot: 'bg-teal-500',
  },
]

export function VideoStatusButton({
  taskId,
  videoId,
  initialStatus,
}: {
  taskId: string
  videoId: string
  initialStatus: BriefStatus
}) {
  const [status, setStatus] = useState<BriefStatus>(initialStatus)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)

  const update = async (next: BriefStatus) => {
    if (next === status || saving) return
    setSaving(true)
    try {
      await fetch(`/api/brief/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, status: next }),
      })
      setStatus(next)
      setFlash(true)
      setTimeout(() => setFlash(false), 2000)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const current = STATUSES.find((s) => s.value === status)

  return (
    <div className="flex flex-col gap-2">
      {/* Current status badge + save indicator */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${current?.active ?? ''}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {current?.label ?? status}
        </span>
        {saving && <span className="text-[10px] text-white/60">Saving…</span>}
        {flash && !saving && <span className="text-[10px] text-white/60">Saved ✓</span>}
      </div>
      {/* Status picker */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={saving}
            onClick={() => update(s.value)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all disabled:opacity-50 ${
              status === s.value ? s.active : s.colour
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
