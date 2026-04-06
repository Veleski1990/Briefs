'use client'

import { useState, useEffect } from 'react'
import { CATEGORY_COLOURS, STATUS_STYLES, slugToDisplay } from '@/lib/calendar-types'
import type { CalendarPost, PostStatus } from '@/lib/calendar-types'

// Group posts by week (Mon–Sun)
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Mon as start
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().slice(0, 10)
}

function formatDay(dateStr: string): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00')
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return { weekday: weekdays[d.getDay()], day: String(d.getDate()), month: months[d.getMonth()] }
}

function formatWeekRange(weekKey: string): string {
  const mon = new Date(weekKey + 'T00:00:00')
  const sun = new Date(mon)
  sun.setDate(sun.getDate() + 6)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (mon.getMonth() === sun.getMonth()) {
    return `${mon.getDate()}–${sun.getDate()} ${months[mon.getMonth()]}`
  }
  return `${mon.getDate()} ${months[mon.getMonth()]} – ${sun.getDate()} ${months[sun.getMonth()]}`
}

interface ApprovalState {
  postId: string
  status: PostStatus
  note: string
  saving: boolean
  done: boolean
}

export default function ClientCalendarPage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const [clientSlug, setClientSlug] = useState('')
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [approval, setApproval] = useState<Record<string, ApprovalState>>({})
  const [noteOpen, setNoteOpen] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ clientSlug: slug }) => {
      setClientSlug(slug)

      // Validate token from URL
      const searchParams = new URLSearchParams(window.location.search)
      const t = searchParams.get('t')
      if (!t) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      fetch(`/api/calendar/token/${slug}?t=${encodeURIComponent(t)}`, { method: 'HEAD' })
        .then((r) => {
          if (r.status !== 200) {
            setAuthorized(false)
            setLoading(false)
            return
          }
          setAuthorized(true)
          return fetch(`/api/calendar/${slug}`)
            .then((r) => r.json())
            .then((data: CalendarPost[]) => {
              const visible = Array.isArray(data)
                ? data.filter((p) => p.status !== 'draft')
                : []
              setPosts(visible)
              const init: Record<string, ApprovalState> = {}
              visible.forEach((p) => {
                init[p.id] = { postId: p.id, status: p.status, note: p.clientNote || '', saving: false, done: false }
              })
              setApproval(init)
            })
            .finally(() => setLoading(false))
        })
        .catch(() => {
          setAuthorized(false)
          setLoading(false)
        })
    })
  }, [params])

  const handleApprove = async (postId: string) => {
    setApproval((prev) => ({ ...prev, [postId]: { ...prev[postId], saving: true } }))
    await fetch(`/api/calendar/${clientSlug}/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    setApproval((prev) => ({ ...prev, [postId]: { ...prev[postId], status: 'approved', saving: false, done: true } }))
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: 'approved' } : p))
  }

  const handleRequestChanges = async (postId: string) => {
    const note = approval[postId]?.note || ''
    setApproval((prev) => ({ ...prev, [postId]: { ...prev[postId], saving: true } }))
    await fetch(`/api/calendar/${clientSlug}/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'changes-requested', clientNote: note }),
    })
    setApproval((prev) => ({ ...prev, [postId]: { ...prev[postId], status: 'changes-requested', saving: false, done: true } }))
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: 'changes-requested', clientNote: note } : p))
    setNoteOpen(null)
  }

  const sorted = [...posts].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))

  // Group by week
  const weeks = new Map<string, CalendarPost[]>()
  for (const post of sorted) {
    const wk = getWeekKey(post.scheduledDate)
    if (!weeks.has(wk)) weeks.set(wk, [])
    weeks.get(wk)!.push(post)
  }
  const weekKeys = Array.from(weeks.keys()).sort()

  const clientName = slugToDisplay(clientSlug)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e4e2dd] flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading your content calendar…</div>
      </div>
    )
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#e4e2dd] flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center max-w-sm w-full shadow-sm">
          <div className="mb-4 text-4xl">🔒</div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Link not valid</h1>
          <p className="text-sm text-gray-500">This calendar link has expired or is incorrect. Please ask Creative AI Media for an updated link.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-4 py-10 font-sans">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="rounded-2xl bg-[#4f1c1e] px-6 py-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#efff72]/70">Creative AI Media</p>
          <h1 className="text-2xl font-bold text-white">{clientName}</h1>
          <p className="mt-1 text-sm text-white/60">Content Calendar — review and approve your upcoming posts.</p>
          <div className="mt-4 flex gap-4 text-xs text-white/50">
            <span>{posts.filter(p => p.status === 'approved').length} approved</span>
            <span>{posts.filter(p => p.status === 'pending').length} awaiting review</span>
            <span>{posts.filter(p => p.status === 'changes-requested').length} changes requested</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-1">
          {(['pending', 'approved', 'changes-requested'] as PostStatus[]).map((s) => {
            const st = STATUS_STYLES[s]
            return (
              <span key={s} className={`rounded-full px-3 py-1 text-xs font-semibold ${st.colour}`}>{st.label}</span>
            )
          })}
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-6 py-14 text-center space-y-2">
            <p className="text-2xl">📅</p>
            <p className="text-sm font-semibold text-gray-700">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
            <p className="text-sm text-gray-400">No content scheduled yet. Check back soon!</p>
          </div>
        ) : (
          weekKeys.map((wk) => {
            const weekPosts = weeks.get(wk)!
            return (
              <div key={wk} className="space-y-2">
                {/* Week label */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-300" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{formatWeekRange(wk)}</span>
                  <div className="h-px flex-1 bg-gray-300" />
                </div>

                {weekPosts.map((post) => {
                  const cat = CATEGORY_COLOURS[post.category]
                  const st = STATUS_STYLES[post.status]
                  const dateInfo = formatDay(post.scheduledDate)
                  const ap = approval[post.id]
                  const isApproved = ap?.status === 'approved'
                  const isChanges = ap?.status === 'changes-requested'
                  const isNoteOpen = noteOpen === post.id

                  return (
                    <div
                      key={post.id}
                      className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${isApproved ? 'border-green-200' : isChanges ? 'border-orange-200' : 'border-gray-200'}`}
                    >
                      {/* Top bar colour */}
                      <div className={`h-1 w-full ${cat.dot.replace('bg-', 'bg-')}`} />

                      <div className="px-5 py-4">
                        <div className="flex items-start gap-4">
                          {/* Date block */}
                          <div className="flex-shrink-0 w-12 text-center">
                            <p className="text-xs font-semibold text-gray-400 uppercase">{dateInfo.weekday}</p>
                            <p className="text-2xl font-bold text-gray-900 leading-none">{dateInfo.day}</p>
                            <p className="text-xs text-gray-400">{dateInfo.month}</p>
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-sm font-bold text-gray-900">{post.title}</h3>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.colour}`}>{st.label}</span>
                            </div>
                            <div className="flex gap-3 text-xs text-gray-400">
                              <span>{post.format}</span>
                              <span className="capitalize">{post.category}</span>
                            </div>

                            {/* Client note if changes requested */}
                            {isChanges && ap?.note && (
                              <p className="mt-2 text-xs text-orange-600 italic bg-orange-50 rounded-lg px-3 py-2">
                                Your note: "{ap.note}"
                              </p>
                            )}

                            {/* Already approved confirmation */}
                            {isApproved && ap?.done && (
                              <p className="mt-2 text-xs text-green-600 font-semibold">Approved — thanks!</p>
                            )}
                            {isChanges && ap?.done && !isNoteOpen && (
                              <p className="mt-2 text-xs text-orange-600 font-semibold">Feedback sent — we'll get back to you.</p>
                            )}
                          </div>

                          {/* Preview link */}
                          {post.previewUrl && (
                            <a
                              href={post.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 rounded-lg bg-[#4f1c1e] px-3 py-1.5 text-xs font-semibold text-[#efff72] hover:opacity-90 transition-opacity"
                            >
                              Preview
                            </a>
                          )}
                        </div>

                        {/* Action buttons — only show if pending */}
                        {ap?.status === 'pending' && !ap?.done && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => handleApprove(post.id)}
                              disabled={ap.saving}
                              className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {ap.saving ? 'Saving…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => setNoteOpen(isNoteOpen ? null : post.id)}
                              className="rounded-lg border border-orange-300 px-4 py-2 text-xs font-bold text-orange-600 hover:bg-orange-50 transition-colors"
                            >
                              Request Changes
                            </button>
                          </div>
                        )}

                        {/* Note input for request changes */}
                        {isNoteOpen && ap?.status === 'pending' && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
                              rows={3}
                              placeholder="What would you like changed? (optional)"
                              value={ap.note}
                              onChange={(e) => setApproval((prev) => ({ ...prev, [post.id]: { ...prev[post.id], note: e.target.value } }))}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRequestChanges(post.id)}
                                disabled={ap.saving}
                                className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                              >
                                {ap.saving ? 'Sending…' : 'Send Feedback'}
                              </button>
                              <button
                                onClick={() => setNoteOpen(null)}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-500 hover:border-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Re-review option for already actioned posts */}
                        {(isApproved || isChanges) && ap?.done && (
                          <button
                            onClick={() => {
                              setApproval((prev) => ({ ...prev, [post.id]: { ...prev[post.id], status: 'pending', done: false, note: '' } }))
                              setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, status: 'pending' } : p))
                              setNoteOpen(null)
                            }}
                            className="mt-2 text-[10px] text-gray-400 underline hover:text-gray-600"
                          >
                            Change my response
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}

        {/* Footer */}
        <div className="pb-6 text-center text-xs text-gray-400">
          Creative AI Media · <a href="mailto:hello@creativeaimedia.com.au" className="underline hover:text-gray-600">hello@creativeaimedia.com.au</a>
        </div>
      </div>
    </div>
  )
}
