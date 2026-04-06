'use client'

import { useState, useEffect } from 'react'
import { CATEGORY_COLOURS, STATUS_STYLES, slugToDisplay } from '@/lib/calendar-types'
import type { CalendarPost, PostStatus } from '@/lib/calendar-types'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// Get Mon-indexed start day (0=Mon, 6=Sun)
function getStartDay(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getWeekLabel(weekDays: (number | null)[], month: number, year: number) {
  const valid = weekDays.filter(Boolean) as number[]
  if (!valid.length) return ''
  const first = valid[0], last = valid[valid.length - 1]
  return `${first} TO ${last} ${MONTHS[month].toUpperCase()}`
}

interface ApprovalState {
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
  const [selected, setSelected] = useState<CalendarPost | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  useEffect(() => {
    params.then(({ clientSlug: slug }) => {
      setClientSlug(slug)
      const t = new URLSearchParams(window.location.search).get('t')
      if (!t) { setAuthorized(false); setLoading(false); return }

      fetch(`/api/calendar/token/${slug}?t=${encodeURIComponent(t)}`, { method: 'HEAD' })
        .then((r) => {
          if (r.status !== 200) { setAuthorized(false); setLoading(false); return }
          setAuthorized(true)
          return fetch(`/api/calendar/${slug}`)
            .then((r) => r.json())
            .then((data: CalendarPost[]) => {
              const visible = Array.isArray(data) ? data.filter((p) => p.status !== 'draft') : []
              setPosts(visible)
              const init: Record<string, ApprovalState> = {}
              visible.forEach((p) => {
                init[p.id] = { status: p.status, note: p.clientNote || '', saving: false, done: false }
              })
              setApproval(init)
              if (visible.length > 0) {
                const d = new Date(visible[0].scheduledDate + 'T00:00:00')
                setViewYear(d.getFullYear())
                setViewMonth(d.getMonth())
              }
            })
            .finally(() => setLoading(false))
        })
        .catch(() => { setAuthorized(false); setLoading(false) })
    })
  }, [params])

  const handleApprove = async (postId: string) => {
    setApproval((p) => ({ ...p, [postId]: { ...p[postId], saving: true } }))
    await fetch(`/api/calendar/${clientSlug}/${postId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    setApproval((p) => ({ ...p, [postId]: { ...p[postId], status: 'approved', saving: false, done: true } }))
    setPosts((p) => p.map((x) => x.id === postId ? { ...x, status: 'approved' } : x))
    if (selected?.id === postId) setSelected((s) => s ? { ...s, status: 'approved' } : s)
  }

  const handleRequestChanges = async (postId: string) => {
    const note = approval[postId]?.note || ''
    setApproval((p) => ({ ...p, [postId]: { ...p[postId], saving: true } }))
    await fetch(`/api/calendar/${clientSlug}/${postId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'changes-requested', clientNote: note }),
    })
    setApproval((p) => ({ ...p, [postId]: { ...p[postId], status: 'changes-requested', saving: false, done: true } }))
    setPosts((p) => p.map((x) => x.id === postId ? { ...x, status: 'changes-requested', clientNote: note } : x))
    if (selected?.id === postId) setSelected((s) => s ? { ...s, status: 'changes-requested' } : s)
    setNoteOpen(false)
  }

  // Build weeks array
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const startDay = getStartDay(viewYear, viewMonth)
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7
  const allCells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startDay + 1
    return d >= 1 && d <= daysInMonth ? d : null
  })
  const weeks: (number | null)[][] = []
  for (let i = 0; i < allCells.length; i += 7) weeks.push(allCells.slice(i, i + 7))

  // Posts by day
  const postsByDay: Record<number, CalendarPost[]> = {}
  posts.forEach((p) => {
    const d = new Date(p.scheduledDate + 'T00:00:00')
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate()
      if (!postsByDay[day]) postsByDay[day] = []
      postsByDay[day].push(p)
    }
  })

  // Stats
  const totalThisMonth = Object.values(postsByDay).flat().length
  const formats = Object.values(postsByDay).flat().reduce<Record<string, number>>((acc, p) => {
    acc[p.format] = (acc[p.format] || 0) + 1; return acc
  }, {})
  const formatSummary = Object.entries(formats).map(([f, n]) => `${n} × ${f}`).join(' | ')

  // Unique categories in this month
  const usedCategories = [...new Set(Object.values(postsByDay).flat().map(p => p.category))]

  const clientName = slugToDisplay(clientSlug)
  const ap = selected ? approval[selected.id] : null

  if (loading) return (
    <div className="min-h-screen bg-[#e4e2dd] flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading your content calendar…</p>
    </div>
  )

  if (authorized === false) return (
    <div className="min-h-screen bg-[#e4e2dd] flex items-center justify-center px-4">
      <div className="rounded-2xl bg-white p-8 text-center max-w-sm w-full shadow-sm">
        <div className="mb-4 text-4xl">🔒</div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Link not valid</h1>
        <p className="text-sm text-gray-500">This link has expired or is incorrect. Please ask Creative AI Media for an updated link.</p>
      </div>
    </div>
  )

  const [firstName, ...rest] = clientName.split(' ')

  return (
    <div className="min-h-screen bg-[#e4e2dd] font-sans">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight leading-none">
                <span className="text-gray-900">{firstName} </span>
                <span className="text-[#4f1c1e]">{rest.join(' ')}</span>
              </h1>
              <p className="mt-1 text-sm text-gray-500">Content Calendar — {MONTHS[viewMonth]} {viewYear}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xl font-black text-gray-800">{totalThisMonth} POSTS</p>
              {formatSummary && <p className="text-xs text-gray-400 mt-0.5">{formatSummary}</p>}
            </div>
          </div>
          <div className="mt-4 h-px bg-gray-300" />
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-4">
          <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }}
            className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors">← Prev</button>
          <span className="text-sm font-bold text-gray-700">{MONTHS[viewMonth]} {viewYear}</span>
          <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }}
            className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors">Next →</button>
        </div>

        {/* Legend */}
        {usedCategories.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {usedCategories.map((cat) => {
              const c = CATEGORY_COLOURS[cat]
              return (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${c.dot}`} />
                  <span className="text-xs text-gray-600 capitalize">{cat}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-400" />
              <span className="text-xs text-gray-600">Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-300" />
              <span className="text-xs text-gray-600">Changes requested</span>
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="space-y-0 rounded-xl overflow-hidden border border-gray-300 shadow-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-[#e4e2dd] border-b border-gray-300">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-bold tracking-widest text-gray-400">{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => {
            const weekPosts = week.flatMap(d => d ? (postsByDay[d] ?? []) : [])
            const weekLabel = `WEEK ${wi + 1} — ${getWeekLabel(week, viewMonth, viewYear)}`
            return (
              <div key={wi}>
                {/* Week header bar */}
                <div className="grid grid-cols-7 bg-gray-900 px-3 py-1.5 border-t border-gray-700">
                  <div className="col-span-5 text-[10px] font-bold tracking-widest text-white">{weekLabel}</div>
                  <div className="col-span-2 text-right text-[10px] text-gray-400 font-semibold">
                    {weekPosts.length > 0 ? `${weekPosts.length} post${weekPosts.length !== 1 ? 's' : ''}` : ''}
                  </div>
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 divide-x divide-gray-200 border-b border-gray-200">
                  {week.map((day, di) => {
                    const dayPosts = day ? (postsByDay[day] ?? []) : []
                    const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
                    return (
                      <div key={di} className={`min-h-[110px] bg-white p-2 ${!day ? 'bg-gray-50' : ''}`}>
                        {day && (
                          <>
                            <p className={`text-xs font-bold mb-1.5 ${isToday ? 'text-[#4f1c1e]' : 'text-gray-400'}`}>{day}</p>
                            {dayPosts.length === 0 && <p className="text-gray-200 text-lg leading-none">—</p>}
                            <div className="space-y-1">
                              {dayPosts.map((post) => {
                                const cat = CATEGORY_COLOURS[post.category]
                                const ap = approval[post.id]
                                const isApproved = ap?.status === 'approved'
                                const isChanges = ap?.status === 'changes-requested'
                                return (
                                  <button
                                    key={post.id}
                                    onClick={() => { setSelected(post); setNoteOpen(false) }}
                                    className={`w-full text-left rounded-lg px-2 py-1.5 transition-opacity hover:opacity-75 ${
                                      isApproved ? 'bg-green-100' : isChanges ? 'bg-orange-100' : cat.bg
                                    }`}
                                  >
                                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${
                                      isApproved ? 'text-green-600' : isChanges ? 'text-orange-500' : cat.text
                                    }`}>{post.format}</p>
                                    <p className={`text-[11px] font-semibold leading-tight ${
                                      isApproved ? 'text-green-800' : isChanges ? 'text-orange-800' : cat.text
                                    }`}>{post.title}</p>
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Creative AI Media · <a href="mailto:hello@creativeaimedia.com.au" className="underline">hello@creativeaimedia.com.au</a>
        </p>
      </div>

      {/* Modal */}
      {selected && ap && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className={`h-1.5 w-full ${CATEGORY_COLOURS[selected.category].dot}`} />
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{selected.format}</p>
                  <h3 className="text-base font-bold text-gray-900 leading-snug">{selected.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(selected.scheduledDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' · '}{selected.category}
                  </p>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[ap.status].colour}`}>
                  {STATUS_STYLES[ap.status].label}
                </span>
              </div>

              {selected.previewUrl && (
                <a href={selected.previewUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#4f1c1e] px-4 py-3 text-sm font-bold text-[#efff72] hover:opacity-90 transition-opacity">
                  Watch Preview →
                </a>
              )}

              {ap.status === 'approved' && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-semibold text-center">
                  Approved — thanks!
                </div>
              )}

              {ap.status === 'changes-requested' && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-700 text-center space-y-1">
                  <p className="font-semibold">Feedback sent — we'll get back to you.</p>
                  {ap.note && <p className="text-xs italic">"{ap.note}"</p>}
                </div>
              )}

              {ap.status === 'pending' && !ap.done && (
                <div className="space-y-2">
                  <button onClick={() => handleApprove(selected.id)} disabled={ap.saving}
                    className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                    {ap.saving ? 'Saving…' : 'Approve this post ✓'}
                  </button>
                  <button onClick={() => setNoteOpen(!noteOpen)}
                    className="w-full rounded-xl border border-orange-300 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50 transition-colors">
                    Request Changes
                  </button>
                  {noteOpen && (
                    <div className="space-y-2">
                      <textarea
                        className="w-full rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm placeholder-gray-400 focus:border-orange-400 focus:outline-none resize-none"
                        rows={3} placeholder="What would you like changed? (optional)"
                        value={ap.note}
                        onChange={(e) => setApproval((prev) => ({ ...prev, [selected.id]: { ...prev[selected.id], note: e.target.value } }))}
                      />
                      <button onClick={() => handleRequestChanges(selected.id)} disabled={ap.saving}
                        className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50">
                        {ap.saving ? 'Sending…' : 'Send Feedback'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(ap.status === 'approved' || ap.status === 'changes-requested') && ap.done && (
                <button onClick={() => {
                  setApproval((prev) => ({ ...prev, [selected.id]: { ...prev[selected.id], status: 'pending', done: false, note: '' } }))
                  setPosts((p) => p.map((x) => x.id === selected.id ? { ...x, status: 'pending' } : x))
                  setSelected((s) => s ? { ...s, status: 'pending' } : s)
                  setNoteOpen(false)
                }} className="w-full text-xs text-gray-400 underline hover:text-gray-600 text-center">
                  Change my response
                </button>
              )}

              <button onClick={() => setSelected(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1 text-center">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
