'use client'

import { useState } from 'react'
import type { BriefStatus } from '@/lib/types'

const STATUS_PILL: Record<BriefStatus, string> = {
  'not-started': 'bg-gray-100 text-gray-600',
  'in-edit':     'bg-blue-100 text-blue-800',
  'amendments':  'bg-orange-100 text-orange-800',
  'in-review':   'bg-purple-100 text-purple-800',
  'approved':    'bg-green-100 text-green-800',
  'scheduled':   'bg-teal-100 text-teal-800',
}
const STATUS_DOT: Record<BriefStatus, string> = {
  'not-started': 'bg-gray-400',
  'in-edit':     'bg-blue-500',
  'amendments':  'bg-orange-500',
  'in-review':   'bg-purple-500',
  'approved':    'bg-green-500',
  'scheduled':   'bg-teal-500',
}
const STATUS_LABEL: Record<BriefStatus, string> = {
  'not-started': 'Not Started',
  'in-edit':     'In Edit',
  'amendments':  'Amendments',
  'in-review':   'In Review',
  'approved':    'Approved',
  'scheduled':   'Scheduled',
}
const ALL_STATUSES: BriefStatus[] = ['not-started', 'in-edit', 'amendments', 'in-review', 'approved', 'scheduled']

export default function VideoRow({
  taskId,
  videoId,
  format,
  duration,
  angleObjective,
  initialStatus,
  assetUrl,
}: {
  taskId: string
  videoId: string
  format: string
  duration: string
  angleObjective: string
  initialStatus: BriefStatus
  assetUrl?: string
}) {
  const [status, setStatus] = useState<BriefStatus>(initialStatus)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const isDone = status === 'approved' || status === 'scheduled'

  const update = async (next: BriefStatus) => {
    if (next === status) { setOpen(false); return }
    setSaving(true)
    await fetch(`/api/brief/${taskId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, status: next }),
    })
    setStatus(next)
    setSaving(false)
    setOpen(false)
  }

  return (
    <div className={`flex items-start gap-3 px-5 py-3 transition-opacity ${isDone ? 'opacity-40' : ''}`}>
      <span className={`mt-1.5 flex-shrink-0 h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />

      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
          {format || 'TBD'}{duration ? ` · ${duration}` : ''}
        </span>
        {angleObjective && (
          <p className={`text-sm mt-0.5 leading-snug font-medium ${isDone ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-800'}`}>
            {angleObjective}
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 self-center">
        {assetUrl && (
          <a href={assetUrl} target="_blank" rel="noopener noreferrer"
            className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 hover:bg-purple-200 whitespace-nowrap">
            Asset →
          </a>
        )}

        {/* Inline status picker */}
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            disabled={saving}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-50 ${STATUS_PILL[status]}`}
          >
            {saving ? '…' : STATUS_LABEL[status]}
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-20 rounded-xl border border-gray-200 bg-white shadow-lg p-1.5 min-w-[160px]">
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => update(s)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    s === status ? STATUS_PILL[s] : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
