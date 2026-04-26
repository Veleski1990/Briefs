'use client'

import { useState } from 'react'
import type { CalendarPost, PostFormat, PostCategory } from '@/lib/calendar-types'

const FORMATS: PostFormat[] = ['REEL', 'SHORT-FORM', 'STATIC', 'CAROUSEL', 'STORY']
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type DaySlot = { format: PostFormat | ''; category: PostCategory }
type Schedule = Record<number, DaySlot> // 0=Mon … 6=Sun

function uid() { return Math.random().toString(36).slice(2, 10) }

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// Get next occurrence of a weekday (0=Mon…6=Sun) from a start date
function getDateForWeekday(startDate: string, weekIndex: number, dayIndex: number): string {
  // startDate is the Monday of week 0
  return addDays(startDate, weekIndex * 7 + dayIndex)
}

// Find the Monday of or after a given date
function getMondayOnOrAfter(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() // 0=Sun,1=Mon...
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const emptySlot = (): DaySlot => ({ format: '', category: 'lifestyle' })

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#4f1c1e] focus:outline-none focus:ring-1 focus:ring-[#4f1c1e]'
const selectClass = `${inputClass} cursor-pointer`

export default function ScheduleGenerator({
  slug,
  clientName,
  onGenerated,
}: {
  slug: string
  clientName: string
  onGenerated: (posts: CalendarPost[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [weeks, setWeeks] = useState(4)
  const [schedule, setSchedule] = useState<Schedule>(() =>
    Object.fromEntries(DAY_NAMES.map((_, i) => [i, emptySlot()]))
  )
  const [generating, setGenerating] = useState(false)

  const setDayFormat = (dayIdx: number, format: PostFormat | '') => {
    setSchedule(s => ({ ...s, [dayIdx]: { ...s[dayIdx], format } }))
  }
  const setDayCategory = (dayIdx: number, category: PostCategory) => {
    setSchedule(s => ({ ...s, [dayIdx]: { ...s[dayIdx], category } }))
  }

  const activeDays = Object.entries(schedule).filter(([, slot]) => slot.format !== '')
  const totalPosts = activeDays.length * weeks

  const generate = async () => {
    if (!startDate || activeDays.length === 0) return
    setGenerating(true)

    const monday = getMondayOnOrAfter(startDate)
    const posts: CalendarPost[] = []

    for (let w = 0; w < weeks; w++) {
      for (const [dayIdxStr, slot] of activeDays) {
        const dayIdx = parseInt(dayIdxStr)
        const date = getDateForWeekday(monday, w, dayIdx)
        const post: CalendarPost = {
          id: uid(),
          clientSlug: slug,
          title: '',
          format: slot.format as PostFormat,
          category: slot.category,
          scheduledDate: date,
          status: 'draft',
          caption: '',
          notes: '',
          createdAt: new Date().toISOString(),
        }
        posts.push(post)
      }
    }

    // Save all posts
    await Promise.all(
      posts.map(p =>
        fetch(`/api/calendar/${slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        })
      )
    )

    setGenerating(false)
    setOpen(false)
    onGenerated(posts)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-[#4f1c1e]/20 py-3 text-sm font-semibold text-[#4f1c1e]/60 hover:border-[#4f1c1e]/50 hover:text-[#4f1c1e] transition-colors"
      >
        Generate schedule from strategy →
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-[#4f1c1e]/20 bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Generate Schedule</h3>
          <p className="mt-0.5 text-xs text-gray-500">Set the posting cadence from your strategy — creates draft slots on each date.</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      {/* Start date + weeks */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Start Date</label>
          <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <p className="mt-1 text-[10px] text-gray-400">Schedule begins on the Monday on or after this date.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Number of Weeks</label>
          <input
            type="number" min={1} max={26}
            className={inputClass}
            value={weeks}
            onChange={e => setWeeks(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </div>

      {/* Day slots */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-gray-400">
          Posting Days — select format for each active day
        </label>
        <div className="space-y-2">
          {DAY_NAMES.map((day, i) => {
            const slot = schedule[i]
            const active = slot.format !== ''
            return (
              <div key={day} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors ${active ? 'bg-[#4f1c1e]/5 border border-[#4f1c1e]/10' : 'bg-gray-50 border border-transparent'}`}>
                <span className={`w-8 text-xs font-bold ${active ? 'text-[#4f1c1e]' : 'text-gray-400'}`}>{day}</span>
                <select
                  value={slot.format}
                  onChange={e => setDayFormat(i, e.target.value as PostFormat | '')}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-[#4f1c1e] focus:outline-none"
                >
                  <option value="">— off —</option>
                  {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                {active && (
                  <select
                    value={slot.category}
                    onChange={e => setDayCategory(i, e.target.value as PostCategory)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-[#4f1c1e] focus:outline-none"
                  >
                    {['founder','product','lifestyle','educational','testimonial','promotional','other'].map(c =>
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    )}
                  </select>
                )}
                {active && (
                  <span className="ml-auto text-[10px] text-gray-400">{weeks} post{weeks !== 1 ? 's' : ''}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary + generate */}
      {totalPosts > 0 && startDate && (
        <div className="rounded-xl bg-[#4f1c1e]/5 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#4f1c1e]">{totalPosts} draft posts for {clientName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeDays.length} post{activeDays.length !== 1 ? 's' : ''}/week · {weeks} week{weeks !== 1 ? 's' : ''} · all created as drafts
            </p>
          </div>
          <button
            type="button"
            disabled={generating || !startDate}
            onClick={generate}
            className="rounded-xl bg-[#4f1c1e] px-5 py-2.5 text-sm font-bold text-[#efff72] hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {generating ? 'Generating…' : 'Generate →'}
          </button>
        </div>
      )}
    </div>
  )
}
