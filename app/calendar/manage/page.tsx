'use client'

import { useState, useEffect, useCallback } from 'react'
const PAID_MEDIA_EXCLUDE = new Set(['FULFILMENT AUS', 'YTSS', 'FLO BUYERS AGENTS'])
import { clientToSlug, slugToDisplay, STATUS_COLOURS, STATUS_STYLES } from '@/lib/calendar-types'
import ScheduleGenerator from './ScheduleGenerator'
import type { CalendarPost, PostFormat, PostCategory, PostStatus } from '@/lib/calendar-types'

// ── Mini calendar preview (same grid logic as client page) ──
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getStartDay(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function CalendarPreview({ posts, clientName }: { posts: CalendarPost[]; clientName: string }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  useEffect(() => {
    const sorted = [...posts].filter(p => p.status !== 'draft').sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate))
    if (sorted.length > 0) {
      const d = new Date(sorted[0].scheduledDate + 'T00:00:00')
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth())
    }
  }, [posts])

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const startDay = getStartDay(viewYear, viewMonth)
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startDay + 1
    return d >= 1 && d <= daysInMonth ? d : null
  })
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const postsByDay: Record<number, CalendarPost[]> = {}
  posts.filter(p => p.status !== 'draft').forEach((p) => {
    const d = new Date(p.scheduledDate + 'T00:00:00')
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate()
      if (!postsByDay[day]) postsByDay[day] = []
      postsByDay[day].push(p)
    }
  })

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-[#4f1c1e] px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#efff72]/70">Preview — client view</p>
          <p className="text-lg font-bold text-white">{clientName} — {MONTH_NAMES[viewMonth]} {viewYear}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y=>y-1) } else setViewMonth(m=>m-1) }}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">← Prev</button>
          <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y=>y+1) } else setViewMonth(m=>m+1) }}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">Next →</button>
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {DAYS.map(d => <div key={d} className="py-2 text-center text-[9px] font-bold tracking-widest text-gray-400">{d}</div>)}
      </div>
      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 divide-x divide-gray-100 border-b border-gray-100">
          {week.map((day, di) => {
            const dayPosts = day ? (postsByDay[day] ?? []) : []
            const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
            return (
              <div key={di} className={`min-h-[80px] p-1.5 ${!day ? 'bg-gray-50/50' : 'bg-white'}`}>
                {day && (
                  <>
                    <p className={`text-[10px] font-bold mb-1 ${isToday ? 'text-[#4f1c1e]' : 'text-gray-300'}`}>{day}</p>
                    {dayPosts.map(post => {
                      const sc = STATUS_COLOURS[post.status]
                      return (
                        <div key={post.id} className={`rounded px-1.5 py-1 mb-0.5 ${sc.bg}`}>
                          <p className={`text-[8px] font-bold uppercase ${sc.text}`}>{post.format}</p>
                          <p className={`text-[9px] font-semibold leading-tight truncate ${sc.text}`}>{post.title}</p>
                          <p className="text-[8px] text-gray-400 capitalize">{post.category}</p>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const FORMATS: PostFormat[] = ['REEL', 'SHORT-FORM', 'STATIC', 'CAROUSEL', 'STORY', 'VSL']
const CATEGORIES: PostCategory[] = ['founder', 'product', 'lifestyle', 'educational', 'testimonial', 'promotional', 'other']

function uid() { return Math.random().toString(36).slice(2, 10) }

function emptyPost(clientSlug: string): Omit<CalendarPost, 'id' | 'createdAt'> {
  return {
    clientSlug,
    title: '',
    format: 'REEL',
    category: 'lifestyle',
    scheduledDate: '',
    previewUrl: '',
    caption: '',
    notes: '',
    status: 'pending',
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#4f1c1e] focus:outline-none focus:ring-1 focus:ring-[#4f1c1e]'
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400'

export default function CalendarManagePage() {
  const [calendarClients, setCalendarClients] = useState<string[]>([])
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyPost(''))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const slug = selectedClient ? clientToSlug(selectedClient) : ''

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then((list: string[]) => setCalendarClients(list.filter(c => !PAID_MEDIA_EXCLUDE.has(c))))
      .catch(() => {})
  }, [])

  const loadToken = useCallback((s: string) => {
    fetch(`/api/calendar/token/${s}`)
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? null))
      .catch(() => setToken(null))
  }, [])

  useEffect(() => {
    if (!selectedClient) { setPosts([]); setToken(null); return }
    setLoading(true)
    fetch(`/api/calendar/${slug}`)
      .then((r) => r.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
    setForm(emptyPost(slug))
    setShowForm(false)
    setEditingId(null)
    loadToken(slug)
  }, [slug, selectedClient, loadToken])

  const handleSave = async () => {
    if (!form.title || !form.scheduledDate) return
    setSaving(true)

    if (editingId) {
      await fetch(`/api/calendar/${slug}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setPosts((prev) => prev.map((p) => p.id === editingId ? { ...p, ...form } : p))
    } else {
      const post: CalendarPost = {
        ...form,
        id: uid(),
        clientSlug: slug,
        createdAt: new Date().toISOString(),
      }
      await fetch(`/api/calendar/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      })
      setPosts((prev) => [...prev, post])
    }

    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm(emptyPost(slug))
  }

  const handleEdit = (post: CalendarPost) => {
    setForm({ ...post })
    setEditingId(post.id)
    setShowForm(true)
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    await fetch(`/api/calendar/${slug}/${postId}`, { method: 'DELETE' })
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const generateToken = async () => {
    const res = await fetch(`/api/calendar/token/${slug}`, { method: 'POST' })
    const d = await res.json()
    setToken(d.token)
  }

  const shareUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/calendar/${slug}?t=${token}`
    : null

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sorted = [...posts].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))

  // Inbox: posts with recent client responses (within 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const inbox = posts.filter((p) =>
    p.respondedAt && new Date(p.respondedAt).getTime() > sevenDaysAgo
  ).sort((a, b) => (b.respondedAt ?? '').localeCompare(a.respondedAt ?? ''))

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-4 py-10 font-sans">
      <div className="mx-auto max-w-4xl space-y-5">

        {/* Header */}
        <div className="rounded-2xl bg-[#4f1c1e] px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#efff72]/70">Creative AI Media</p>
              <h1 className="font-heading text-4xl text-white">Content Calendar</h1>
              <p className="mt-1 text-sm text-white/60">Manage posts and send to clients for approval.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <a href="/dashboard" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">Dashboard →</a>
              <a href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">New Brief →</a>
            </div>
          </div>
        </div>

        {/* Client selector */}
        <div className="rounded-2xl bg-white border border-gray-200 px-5 py-4 shadow-sm">
          <label className={labelClass}>Client</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {calendarClients.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedClient(selectedClient === c ? null : c)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${selectedClient === c ? 'border-[#4f1c1e] bg-[#4f1c1e] text-[#efff72]' : 'border-gray-200 text-gray-700 hover:border-[#4f1c1e]'}`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Shareable link */}
          {selectedClient && (
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
              <p className={labelClass}>Client calendar link</p>
              {shareUrl ? (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 font-mono focus:outline-none"
                  />
                  <button
                    onClick={copyLink}
                    className="rounded-lg bg-[#4f1c1e] px-3 py-2 text-xs font-bold text-[#efff72] hover:opacity-90"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">No link generated yet</span>
                  <button
                    onClick={generateToken}
                    className="rounded-lg border border-[#4f1c1e] px-3 py-1.5 text-xs font-semibold text-[#4f1c1e] hover:bg-[#4f1c1e] hover:text-[#efff72] transition-colors"
                  >
                    Generate link
                  </button>
                </div>
              )}
              <p className="text-[10px] text-gray-400">Share this link with {selectedClient} — only people with this link can view and approve posts.</p>
              {shareUrl && (
                <button onClick={generateToken} className="text-[10px] text-gray-400 underline hover:text-gray-600">
                  Regenerate link (invalidates old one)
                </button>
              )}
            </div>
          )}

          {selectedClient && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-gray-500">{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-500">{posts.filter(p => p.status === 'approved').length} approved</span>
              {posts.filter(p => p.status === 'changes-requested').length > 0 && (
                <>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-orange-600 font-semibold">{posts.filter(p => p.status === 'changes-requested').length} need changes</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Inbox — client responses (shown only when a client is selected) */}
        {selectedClient && inbox.length > 0 && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
              Client Activity — {inbox.length} response{inbox.length !== 1 ? 's' : ''} in the last 7 days
            </p>
            {inbox.map((post) => {
              const st = STATUS_STYLES[post.status]
              return (
                <div key={post.id} className="flex items-start gap-3 rounded-xl bg-white border border-orange-100 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{post.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.colour}`}>{st.label}</span>
                      {post.respondedAt && <span className="text-[10px] text-gray-400">{timeAgo(post.respondedAt)}</span>}
                    </div>
                    {post.clientNote && <p className="mt-1 text-xs text-orange-700 italic">"{post.clientNote}"</p>}
                  </div>
                  <button onClick={() => handleEdit(post)}
                    className="flex-shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-400">
                    Edit
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add post / generate schedule */}
        {selectedClient && !showForm && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyPost(slug)) }}
              className="w-full rounded-2xl border-2 border-dashed border-[#4f1c1e]/30 py-3 text-sm font-semibold text-[#4f1c1e] hover:border-[#4f1c1e] transition-colors"
            >
              + Add Single Post
            </button>
            <ScheduleGenerator
              slug={slug}
              clientName={selectedClient}
              onGenerated={(newPosts) => setPosts(prev => [...prev, ...newPosts])}
            />
          </div>
        )}

        {/* Post form */}
        {showForm && (
          <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">{editingId ? 'Edit Post' : 'New Post'}</h2>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Post Title / Description</label>
                <input className={inputClass} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Behind the scenes at Rowanos kitchen" />
              </div>
              <div>
                <label className={labelClass}>Scheduled Date</label>
                <input type="date" className={inputClass} value={form.scheduledDate} onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Format</label>
                <select className={inputClass} value={form.format} onChange={(e) => setForm((p) => ({ ...p, format: e.target.value as PostFormat }))}>
                  {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select className={inputClass} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as PostCategory }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as PostStatus }))}>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="changes-requested">Changes Requested</option>
                  <option value="scheduled">Scheduled / Posted</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Preview / Frame.io Link</label>
                <input className={inputClass} value={form.previewUrl || ''} onChange={(e) => setForm((p) => ({ ...p, previewUrl: e.target.value }))} placeholder="Frame.io review link or direct video URL" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Caption / Copy</label>
                <textarea className={`${inputClass} resize-y`} rows={4} value={form.caption || ''} onChange={(e) => setForm((p) => ({ ...p, caption: e.target.value }))} placeholder="Paste the post caption here — this will be shown to the client for review alongside the video…" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes (internal only)</label>
                <textarea className={`${inputClass} resize-y`} rows={2} value={form.notes || ''} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any internal notes for the team — not shown to client…" />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.title || !form.scheduledDate}
              className="w-full rounded-xl bg-[#4f1c1e] py-3 text-sm font-bold text-[#efff72] hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Post'}
            </button>
          </div>
        )}

        {/* Preview toggle */}
        {selectedClient && sorted.length > 0 && (
          <button
            onClick={() => setShowPreview(p => !p)}
            className={`w-full rounded-2xl border-2 py-3 text-sm font-semibold transition-all ${showPreview ? 'border-[#4f1c1e] bg-[#4f1c1e] text-[#efff72]' : 'border-[#4f1c1e]/30 text-[#4f1c1e] hover:border-[#4f1c1e]'}`}
          >
            {showPreview ? 'Hide Calendar Preview' : 'Preview Client Calendar'}
          </button>
        )}

        {showPreview && selectedClient && (
          <CalendarPreview posts={posts} clientName={selectedClient} />
        )}

        {/* Posts list */}
        {!selectedClient ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-5 py-12 text-center text-gray-400">
            <p className="text-sm font-medium">Select a client above to manage their calendar.</p>
          </div>
        ) : loading ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-5 py-10 text-center text-sm text-gray-400">No posts yet for {selectedClient}.</div>
        ) : (
          <div className="space-y-2">
            {sorted.map((post) => {
              const sc = STATUS_COLOURS[post.status]
              const st = STATUS_STYLES[post.status]
              const [, m, d] = post.scheduledDate.split('-')
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
              const dateDisplay = `${d} ${months[parseInt(m) - 1]}`
              return (
                <div key={post.id} className={`flex items-center gap-4 rounded-2xl border bg-white px-5 py-3.5 shadow-sm ${post.status === 'changes-requested' ? 'border-orange-200' : 'border-gray-200'}`}>
                  <div className={`flex-shrink-0 rounded-full w-2.5 h-2.5 ${sc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{post.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.colour}`}>{st.label}</span>
                      {post.respondedAt && (
                        <span className="text-[10px] text-gray-400">{timeAgo(post.respondedAt)}</span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                      <span>{dateDisplay}</span>
                      <span>{post.format}</span>
                      <span className="capitalize">{post.category}</span>
                    </div>
                    {post.clientNote && (
                      <p className="mt-1 text-xs text-orange-600 italic">"{post.clientNote}"</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    {post.previewUrl && (
                      <a href={post.previewUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-400">Preview</a>
                    )}
                    <button onClick={() => handleEdit(post)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-400">Edit</button>
                    <button onClick={() => handleDelete(post.id)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400 hover:border-red-200 hover:text-red-500">Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
