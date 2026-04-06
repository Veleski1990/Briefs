import { getRedis } from '@/lib/redis'
import type { StoredBrief, BriefStatus } from '@/lib/types'
import Link from 'next/link'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

async function getAllBriefs(): Promise<StoredBrief[]> {
  const redis = await getRedis()
  if (!redis) return []

  const taskIds = await redis.lrange('briefs:index', 0, 199)
  if (taskIds.length === 0) {
    await redis.quit()
    return []
  }

  const raws = await redis.mget(...taskIds.map((id) => `brief:${id}`))
  await redis.quit()

  return raws
    .filter((r): r is string => r !== null)
    .map((r) => {
      try {
        const parsed = JSON.parse(r)
        // Handle old format (plain BriefFormData)
        if (!parsed.brief) return null
        return parsed as StoredBrief
      } catch {
        return null
      }
    })
    .filter((b): b is StoredBrief => b !== null)
}

function overallStatus(videoStatuses: Record<string, BriefStatus>): BriefStatus {
  const vals = Object.values(videoStatuses)
  if (vals.length === 0) return 'not-started'
  if (vals.every((s) => s === 'scheduled')) return 'scheduled'
  if (vals.every((s) => s === 'approved' || s === 'scheduled')) return 'approved'
  if (vals.some((s) => s === 'amendments')) return 'amendments'
  if (vals.some((s) => s === 'in-review')) return 'in-review'
  if (vals.some((s) => s === 'in-edit')) return 'in-edit'
  return 'not-started'
}

const STATUS_STYLES: Record<BriefStatus, string> = {
  'not-started': 'bg-gray-100 text-gray-500',
  'in-edit': 'bg-blue-100 text-blue-700',
  'amendments': 'bg-orange-100 text-orange-700',
  'in-review': 'bg-purple-100 text-purple-700',
  'approved': 'bg-green-100 text-green-700',
  'scheduled': 'bg-teal-100 text-teal-700',
}

const STATUS_DOT: Record<BriefStatus, string> = {
  'not-started': 'bg-gray-300',
  'in-edit': 'bg-blue-400',
  'amendments': 'bg-orange-400',
  'in-review': 'bg-purple-400',
  'approved': 'bg-green-400',
  'scheduled': 'bg-teal-400',
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatShootDate(dateStr: string) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[parseInt(m) - 1]} ${y}`
}

export default async function DashboardPage() {
  const briefs = await getAllBriefs()

  const counts: Record<BriefStatus, number> = { 'not-started': 0, 'in-edit': 0, 'amendments': 0, 'in-review': 0, 'approved': 0, 'scheduled': 0 }
  for (const b of briefs) counts[overallStatus(b.videoStatuses ?? {})]++

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-4 py-10 font-sans">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── HEADER ── */}
        <div className="rounded-2xl bg-[#4f1c1e] px-6 py-5 shadow-lg">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#efff72]/70">
            Creative AI Media
          </p>
          <h1 className="font-heading text-4xl text-white">Brief Dashboard</h1>
          <p className="mt-1 text-sm text-white/60">
            All submitted editor briefs — {briefs.length} total
          </p>
        </div>

        {/* ── SUMMARY CARDS ── */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {([['not-started', 'Not Started', 'text-gray-600 bg-gray-50 border-gray-200'], ['in-edit', 'In Edit', 'text-blue-700 bg-blue-50 border-blue-200'], ['amendments', 'Amendments', 'text-orange-700 bg-orange-50 border-orange-200'], ['in-review', 'In Review', 'text-purple-700 bg-purple-50 border-purple-200'], ['approved', 'Approved', 'text-green-700 bg-green-50 border-green-200'], ['scheduled', 'Scheduled', 'text-teal-700 bg-teal-50 border-teal-200']] as const).map(([key, label, style]) => (
            <div key={key} className={`rounded-2xl border px-5 py-4 ${style}`}>
              <p className="text-3xl font-bold">{counts[key]}</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest opacity-70">{label}</p>
            </div>
          ))}
        </div>

        {/* ── BRIEF LIST ── */}
        {briefs.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-6 py-12 text-center text-gray-400">
            <p className="text-sm">No briefs submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {briefs.map((stored) => {
              const { brief, taskId, taskUrl, briefUrl, submittedAt } = stored
              const vstatus = stored.videoStatuses ?? {}
              const overall = overallStatus(vstatus)
              const doneCount = Object.values(vstatus).filter(s => s === 'approved' || s === 'scheduled').length
              const amendCount = Object.values(vstatus).filter(s => s === 'amendments').length
              return (
                <div
                  key={taskId}
                  className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="flex items-start gap-4 px-5 py-4">
                    {/* Status dot */}
                    <div className="mt-1.5 flex-shrink-0">
                      <span className={`block h-2.5 w-2.5 rounded-full ${STATUS_DOT[overall]}`} />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{brief.client}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[overall]}`}>
                          {doneCount}/{brief.videos.length} done{amendCount > 0 ? ` · ${amendCount} amendments` : ''}
                        </span>
                        {brief.pipeline && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            {brief.pipeline}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                        <span>Shoot: {formatShootDate(brief.shootDate)}</span>
                        <span>Submitted: {formatDate(submittedAt)}</span>
                        <span>{brief.videos.length} video{brief.videos.length !== 1 ? 's' : ''}</span>
                        {brief.platform && <span>{brief.platform}</span>}
                        {brief.assignedEditor && <span>Editor: {brief.assignedEditor}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <DeleteButton taskId={taskId} />
                      {taskUrl && (
                        <a
                          href={taskUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                        >
                          ClickUp
                        </a>
                      )}
                      <Link
                        href={briefUrl || `/brief/${taskId}`}
                        target="_blank"
                        className="rounded-lg bg-[#4f1c1e] px-3 py-1.5 text-xs font-semibold text-[#efff72] hover:opacity-90 transition-opacity"
                      >
                        View Brief →
                      </Link>
                    </div>
                  </div>

                  {/* Video previews */}
                  {brief.videos.length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-2.5 flex gap-2 overflow-x-auto">
                      {brief.videos.map((v, i) => (
                        <span
                          key={v.id}
                          className="flex-shrink-0 rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-600 font-medium"
                        >
                          {i + 1}. {v.format || 'TBD'}{v.deadline ? ` · ${formatShootDate(v.deadline)}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── NAV ── */}
        <div className="flex gap-3 pb-4">
          <Link
            href="/"
            className="rounded-xl bg-[#4f1c1e] px-4 py-2.5 text-sm font-semibold text-[#efff72] hover:opacity-90 transition-opacity"
          >
            + New Brief
          </Link>
          <Link
            href="/clients"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 hover:border-gray-400 transition-colors"
          >
            Client Profiles
          </Link>
          <Link
            href="/calendar/manage"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 hover:border-gray-400 transition-colors"
          >
            Content Calendar
          </Link>
        </div>

      </div>
    </div>
  )
}
