'use client'

import { useState, useEffect } from 'react'

type BriefStub = { id: string; submittedAt: string; client: string; pipeline: string }
type Stats = {
  total: number
  ageBuckets: { last30: number; days30to90: number; older: number; unknown: number }
  olderThan90Days: BriefStub[]
}

type CleanupResult = { scanned: number; wouldDelete?: number; deleted?: number; victims: BriefStub[] } | { error: string }
type SyncResult = { scanned: number; videosScanned: number; videosSyncedFromMonday: number; updated: number; unchanged: number; notes: string[] } | { error: string }

const inputClass = 'w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#4f1c1e] focus:outline-none focus:ring-1 focus:ring-[#4f1c1e]'

export default function AdminCleanupPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [olderThanDays, setOlderThanDays] = useState(90)
  const [preview, setPreview] = useState<CleanupResult | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<CleanupResult | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  const loadStats = () => {
    setLoading(true)
    fetch('/api/admin/brief-stats')
      .then(r => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStats() }, [])

  const runPreview = async () => {
    setPreview(null); setDeleteResult(null)
    const res = await fetch('/api/admin/cleanup-briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ olderThanDays, dryRun: true }),
    })
    setPreview(await res.json())
  }

  const runDelete = async () => {
    if (!preview || 'error' in preview) return
    const count = preview.wouldDelete ?? 0
    if (count === 0) return
    if (!confirm(`Delete ${count} brief${count !== 1 ? 's' : ''}? This is permanent.`)) return
    setDeleting(true)
    const res = await fetch('/api/admin/cleanup-briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ olderThanDays, confirm: 'YES-DELETE' }),
    })
    setDeleteResult(await res.json())
    setDeleting(false)
    setPreview(null)
    loadStats()
  }

  const runSync = async () => {
    setSyncing(true); setSyncResult(null)
    const res = await fetch('/api/admin/sync-statuses', { method: 'POST' })
    setSyncResult(await res.json())
    setSyncing(false)
    loadStats()
  }

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">

        <div className="rounded-2xl bg-[#4f1c1e] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#efff72]">Admin</p>
          <h1 className="mt-1 text-3xl font-black text-white">Dashboard Cleanup</h1>
          <p className="mt-1 text-sm text-white/70">Trim old briefs and re-sync statuses from Monday.com.</p>
        </div>

        {/* Current state */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Current state</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-2xl font-black text-gray-800">{stats.total}</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Total briefs</p>
              </div>
              <div className="rounded-xl bg-green-50 px-4 py-3">
                <p className="text-2xl font-black text-green-700">{stats.ageBuckets.last30}</p>
                <p className="text-xs text-green-600 uppercase tracking-widest">Last 30 days</p>
              </div>
              <div className="rounded-xl bg-yellow-50 px-4 py-3">
                <p className="text-2xl font-black text-yellow-700">{stats.ageBuckets.days30to90}</p>
                <p className="text-xs text-yellow-600 uppercase tracking-widest">30 – 90 days</p>
              </div>
              <div className="rounded-xl bg-red-50 px-4 py-3">
                <p className="text-2xl font-black text-red-700">{stats.ageBuckets.older}</p>
                <p className="text-xs text-red-600 uppercase tracking-widest">Older than 90 days</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-500">Failed to load stats.</p>
          )}
        </div>

        {/* Cleanup */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Delete old briefs</h2>
          <p className="text-sm text-gray-600">
            Removes briefs from the dashboard permanently. Monday.com items are <strong>not</strong> touched — this only clears the app's snapshot.
          </p>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Delete briefs older than</label>
            <input type="number" min={1} className={inputClass} value={olderThanDays} onChange={(e) => { setOlderThanDays(parseInt(e.target.value || '0', 10) || 90); setPreview(null); setDeleteResult(null) }} />
            <span className="text-sm text-gray-600">days</span>
            <button
              type="button"
              onClick={runPreview}
              className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-500"
            >
              Preview
            </button>
          </div>

          {preview && 'error' in preview && (
            <p className="text-sm text-red-600">Error: {preview.error}</p>
          )}
          {preview && 'wouldDelete' in preview && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                <strong>{preview.wouldDelete}</strong> of {preview.scanned} briefs match. Sample of what would be deleted:
              </p>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs font-mono">
                {preview.victims.slice(0, 30).map((v) => (
                  <div key={v.id} className="text-gray-600">
                    {v.submittedAt?.slice(0, 10)} · {v.pipeline} · {v.client}
                  </div>
                ))}
                {preview.victims.length > 30 && <div className="mt-1 text-gray-400">…and {preview.victims.length - 30} more</div>}
              </div>
              <button
                type="button"
                disabled={deleting || (preview.wouldDelete ?? 0) === 0}
                onClick={runDelete}
                className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : `Delete ${preview.wouldDelete} briefs — permanent`}
              </button>
            </div>
          )}
          {deleteResult && 'deleted' in deleteResult && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              Deleted {deleteResult.deleted} briefs. Dashboard should now be much cleaner.
            </div>
          )}
        </div>

        {/* Sync */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Sync statuses from Monday</h2>
          <p className="text-sm text-gray-600">
            For every remaining brief, fetches the current status of each video from Monday.com and updates the dashboard snapshot to match. Use this after cleanup to make the dashboard reflect reality.
          </p>
          <button
            type="button"
            onClick={runSync}
            disabled={syncing}
            className="w-full rounded-xl bg-[#4f1c1e] py-3 text-sm font-bold text-[#efff72] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {syncing ? 'Syncing (this can take ~30–60 seconds)…' : 'Sync all statuses now'}
          </button>
          {syncResult && 'error' in syncResult && (
            <p className="text-sm text-red-600">Error: {syncResult.error}</p>
          )}
          {syncResult && 'updated' in syncResult && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 space-y-1">
              <p>Scanned <strong>{syncResult.videosScanned}</strong> videos across {syncResult.scanned} briefs.</p>
              <p>Read <strong>{syncResult.videosSyncedFromMonday}</strong> statuses from Monday.</p>
              <p><strong>{syncResult.updated}</strong> updated · <strong>{syncResult.unchanged}</strong> already matched.</p>
              {syncResult.notes.length > 0 && <p className="text-xs italic text-blue-600">{syncResult.notes.join(' · ')}</p>}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          <a href="/dashboard" className="underline hover:text-gray-600">← Back to dashboard</a>
        </p>
      </div>
    </div>
  )
}
