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
        if (!parsed.brief) return null
        return parsed as StoredBrief
      } catch {
        return null
      }
    })
    .filter((b): b is StoredBrief => b !== null)
}

const DONE_STATUSES = new Set<BriefStatus>(['approved', 'scheduled'])

function isVideoDone(s: BriefStatus) { return DONE_STATUSES.has(s) }

function urgencyScore(statuses: BriefStatus[]): number {
  if (statuses.some(s => s === 'amendments')) return 4
  if (statuses.some(s => s === 'in-review')) return 3
  if (statuses.some(s => s === 'in-edit')) return 2
  if (statuses.some(s => s === 'not-started')) return 1
  return 0
}

const STATUS_PILL: Record<BriefStatus, string> = {
  'not-started': 'bg-gray-100 text-gray-500',
  'in-edit':     'bg-blue-100 text-blue-700',
  'amendments':  'bg-orange-100 text-orange-700',
  'in-review':   'bg-purple-100 text-purple-700',
  'approved':    'bg-green-100 text-green-700',
  'scheduled':   'bg-teal-100 text-teal-700',
}
const STATUS_DOT: Record<BriefStatus, string> = {
  'not-started': 'bg-gray-300',
  'in-edit':     'bg-blue-400',
  'amendments':  'bg-orange-400',
  'in-review':   'bg-purple-400',
  'approved':    'bg-green-400',
  'scheduled':   'bg-teal-400',
}
const STATUS_LABEL: Record<BriefStatus, string> = {
  'not-started': 'Not Started',
  'in-edit':     'In Edit',
  'amendments':  'Amendments',
  'in-review':   'In Review',
  'approved':    'Approved',
  'scheduled':   'Scheduled',
}

function formatShootDate(dateStr: string) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[parseInt(m) - 1]} ${y}`
}

export default async function DashboardPage() {
  const briefs = await getAllBriefs()

  // Group by client
  const byClient = new Map<string, StoredBrief[]>()
  for (const b of briefs) {
    const client = b.brief.client || 'Unknown'
    if (!byClient.has(client)) byClient.set(client, [])
    byClient.get(client)!.push(b)
  }

  // Separate active clients from done clients
  const activeClients: { client: string; briefs: StoredBrief[]; score: number }[] = []
  const doneClients: { client: string; briefs: StoredBrief[] }[] = []

  for (const [client, clientBriefs] of byClient) {
    const allStatuses = clientBriefs.flatMap(b =>
      b.brief.videos.map(v => b.videoStatuses?.[v.id] ?? 'not-started')
    )
    const allDone = allStatuses.length > 0 && allStatuses.every(isVideoDone)
    if (allDone) {
      doneClients.push({ client, briefs: clientBriefs })
    } else {
      activeClients.push({ client, briefs: clientBriefs, score: urgencyScore(allStatuses) })
    }
  }

  // Sort active clients by urgency descending
  activeClients.sort((a, b) => b.score - a.score)

  // Summary counts (video-level)
  const counts: Record<BriefStatus, number> = {
    'not-started': 0, 'in-edit': 0, 'amendments': 0,
    'in-review': 0, 'approved': 0, 'scheduled': 0,
  }
  for (const b of briefs) {
    for (const v of b.brief.videos) {
      const s = b.videoStatuses?.[v.id] ?? 'not-started'
      counts[s]++
    }
  }

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-4 py-10 font-sans">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="rounded-2xl bg-[#4f1c1e] px-6 py-5 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#efff72]/70">Creative AI Media</p>
              <h1 className="font-heading text-4xl text-white">Edit Dashboard</h1>
              <p className="mt-1 text-sm text-white/60">
                {activeClients.length} active client{activeClients.length !== 1 ? 's' : ''} · {doneClients.length} completed
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2 pt-1">
              <Link href="/"
                className="rounded-lg bg-[#efff72] px-3 py-1.5 text-xs font-semibold text-[#4f1c1e] hover:opacity-90 transition-opacity">
                + New Brief
              </Link>
              <Link href="/clients"
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                Client Profiles
              </Link>
              <Link href="/calendar/manage"
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                Content Calendar
              </Link>
            </div>
          </div>
        </div>

        {/* Video-level status summary */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {([
            ['not-started', 'Not Started', 'text-gray-600 bg-gray-50 border-gray-200'],
            ['in-edit',     'In Edit',     'text-blue-700 bg-blue-50 border-blue-200'],
            ['amendments',  'Amendments',  'text-orange-700 bg-orange-50 border-orange-200'],
            ['in-review',   'In Review',   'text-purple-700 bg-purple-50 border-purple-200'],
            ['approved',    'Approved',    'text-green-700 bg-green-50 border-green-200'],
            ['scheduled',   'Scheduled',   'text-teal-700 bg-teal-50 border-teal-200'],
          ] as const).map(([key, label, style]) => (
            <div key={key} className={`rounded-2xl border px-4 py-3 ${style}`}>
              <p className="text-2xl font-bold">{counts[key]}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest opacity-70">{label}</p>
            </div>
          ))}
        </div>

        {/* Active clients */}
        {activeClients.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 px-6 py-12 text-center text-gray-400">
            <p className="text-sm font-medium">All caught up — no active edits.</p>
          </div>
        )}

        {activeClients.map(({ client, briefs: clientBriefs }) => (
          <div key={client} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Client header */}
            <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-5 py-3">
              <h2 className="font-heading text-xl text-[#4f1c1e]">{client}</h2>
              <span className="text-xs text-gray-400">
                {clientBriefs.reduce((n, b) => n + b.brief.videos.length, 0)} videos across {clientBriefs.length} brief{clientBriefs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Briefs for this client */}
            <div className="divide-y divide-gray-100">
              {clientBriefs
                .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
                .map((stored) => {
                  const { brief, taskId, taskUrl, briefUrl, videoStatuses, videoAssetUrls } = stored
                  const vstatus = videoStatuses ?? {}

                  return (
                    <div key={taskId} className="px-5 py-4 space-y-3">
                      {/* Brief meta row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">
                          Shoot {formatShootDate(brief.shootDate)}
                        </span>
                        {brief.pipeline && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                            {brief.pipeline}
                          </span>
                        )}
                        {brief.assignedEditor && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                            Editor: {brief.assignedEditor}
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <DeleteButton taskId={taskId} />
                          {taskUrl && (
                            <a href={taskUrl} target="_blank" rel="noopener noreferrer"
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 hover:border-gray-400 transition-colors">
                              ClickUp
                            </a>
                          )}
                          <Link href={briefUrl || `/brief/${taskId}`} target="_blank"
                            className="rounded-lg bg-[#4f1c1e] px-2.5 py-1 text-[11px] font-semibold text-[#efff72] hover:opacity-90 transition-opacity">
                            Brief →
                          </Link>
                        </div>
                      </div>

                      {/* Per-video rows */}
                      <div className="space-y-1.5">
                        {brief.videos.map((v, i) => {
                          const status = vstatus[v.id] ?? 'not-started'
                          const assetUrl = videoAssetUrls?.[v.id]
                          const isDone = isVideoDone(status)
                          return (
                            <div key={v.id}
                              className={`flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 ${isDone ? 'bg-gray-50 opacity-60' : 'bg-white border border-gray-100'}`}>
                              {/* Status dot */}
                              <span className={`flex-shrink-0 h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                              {/* Video label */}
                              <span className="text-xs font-semibold text-gray-700 min-w-[60px]">
                                Video {i + 1}{v.format ? ` · ${v.format}` : ''}
                              </span>
                              {v.duration && (
                                <span className="text-[10px] text-gray-400">{v.duration}</span>
                              )}
                              {v.deadline && (
                                <span className="text-[10px] text-gray-400">Due {formatShootDate(v.deadline)}</span>
                              )}
                              {/* Status pill */}
                              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_PILL[status]}`}>
                                {STATUS_LABEL[status]}
                              </span>
                              {/* Asset link if submitted */}
                              {assetUrl && (
                                <a href={assetUrl} target="_blank" rel="noopener noreferrer"
                                  className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700 hover:bg-purple-200 transition-colors">
                                  Final Asset →
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}

        {/* Completed clients — collapsed */}
        {doneClients.length > 0 && (
          <details className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm text-gray-400 hover:text-gray-600 select-none">
              <span className="font-semibold">Completed — {doneClients.length} client{doneClients.length !== 1 ? 's' : ''}</span>
              <span className="text-xs">▸ Show</span>
            </summary>
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {doneClients.map(({ client, briefs: clientBriefs }) => (
                <div key={client} className="flex flex-wrap items-center gap-2 px-5 py-3">
                  <span className="text-sm font-semibold text-gray-500">{client}</span>
                  <span className="text-xs text-gray-400">
                    {clientBriefs.reduce((n, b) => n + b.brief.videos.length, 0)} videos
                  </span>
                  <div className="ml-auto flex gap-2">
                    {clientBriefs.map(b => (
                      <Link key={b.taskId} href={b.briefUrl || `/brief/${b.taskId}`} target="_blank"
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] text-gray-400 hover:border-gray-400 transition-colors">
                        Brief →
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}


      </div>
    </div>
  )
}
