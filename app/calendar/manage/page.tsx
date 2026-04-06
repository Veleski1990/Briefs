'use client'

import { useState, useEffect, useCallback } from 'react'
import { CLIENTS } from '@/lib/constants'
import type { Client } from '@/lib/types'
import { clientToSlug, CATEGORY_COLOURS, STATUS_STYLES } from '@/lib/calendar-types'
import type { CalendarPost, PostFormat, PostCategory, PostStatus } from '@/lib/calendar-types'

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
  const [selectedClient, setSelectedClient] = useState<Client>(CLIENTS[0])
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyPost(clientToSlug(CLIENTS[0])))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const slug = clientToSlug(selectedClient)

  const loadToken = useCallback((s: string) => {
    fetch(`/api/calendar/token/${s}`)
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? null))
      .catch(() => setToken(null))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/calendar/${slug}`)
      .then((r) => r.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
    setForm(emptyPost(slug))
    setShowForm(false)
    setEditingId(null)
    loadToken(slug)
  }, [slug, loadToken])

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
              <h1 className="text-2xl font-bold text-white">Content Calendar</h1>
              <p className="mt-1 text-sm text-white/60">Manage posts and send to clients for approval.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <a href="/dashboard" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">Dashboard →</a>
              <a href="/" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">New Brief →</a>
            </div>
          </div>
        </div>

        {/* Inbox — client responses */}
        {inbox.length > 0 && (
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
                      {post.respondedAt && (
                        <span className="text-[10px] text-gray-400">{timeAgo(post.respondedAt)}</span>
                      )}
                    </div>
                    {post.clientNote && (
                      <p className="mt-1 text-xs text-orange-700 italic">"{post.clientNote}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(post)}
                    className="flex-shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-400"
                  >
                    Edit
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Client selector */}
        <div className="rounded-2xl bg-white border border-gray-200 px-5 py-4 shadow-sm">
          <label className={labelClass}>Client</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CLIENTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedClient(c)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${selectedClient === c ? 'border-[#4f1c1e] bg-[#4f1c1e] text-[#efff72]' : 'border-gray-200 text-gray-600 hover:border-[#4f1c1e]'}`}
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

          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-gray-400">{posts.length} post{posts.length !== 1 ? 's' : ''} total</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{posts.filter(p => p.status === 'approved').length} approved</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-orange-500 font-semibold">{posts.filter(p => p.status === 'changes-requested').length} need changes</span>
          </div>
        </div>

        {/* Add post button */}
        {!showForm && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyPost(slug)) }}
            className="w-full rounded-2xl border-2 border-dashed border-[#4f1c1e]/30 py-4 text-sm font-semibold text-[#4f1c1e] hover:border-[#4f1c1e] transition-colors"
          >
            + Add Post
          </button>
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
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Preview / Frame.io Link</label>
                <input className={inputClass} value={form.previewUrl || ''} onChange={(e) => setForm((p) => ({ ...p, previewUrl: e.target.value }))} placeholder="Frame.io review link or direct video URL" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes (internal)</label>
                <textarea className={`${inputClass} resize-y`} rows={2} value={form.notes || ''} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any notes for the team…" />
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

        {/* Posts list */}
        {loading ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-5 py-10 text-center text-sm text-gray-400">No posts yet for {selectedClient}.</div>
        ) : (
          <div className="space-y-2">
            {sorted.map((post) => {
              const cat = CATEGORY_COLOURS[post.category]
              const st = STATUS_STYLES[post.status]
              const [, m, d] = post.scheduledDate.split('-')
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
              const dateDisplay = `${d} ${months[parseInt(m) - 1]}`
              return (
                <div key={post.id} className={`flex items-center gap-4 rounded-2xl border bg-white px-5 py-3.5 shadow-sm ${post.status === 'changes-requested' ? 'border-orange-200' : 'border-gray-200'}`}>
                  <div className={`flex-shrink-0 rounded-full w-2.5 h-2.5 ${cat.dot}`} />
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
