import { getRedis } from '@/lib/redis'
import type { StoredBrief, BriefStatus } from '@/lib/types'
import Link from 'next/link'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

const PIPELINES = ['ORGANIC RETAINER', 'PAID ADS RETAINER', 'UGC PIPELINE', 'PROPERTY VIDEO'] as const
type Pipeline = typeof PIPELINES[number]

async function getAllBriefs(): Promise<StoredBrief[]> {
  const redis = await getRedis()
  if (!redis) return []
  const taskIds = await redis.lrange('briefs:index', 0, 199)
  if (taskIds.length === 0) { await redis.quit(); return [] }
  const raws = await redis.mget(...taskIds.map((id) => `brief:${id}`))
  await redis.quit()
  return raws
    .filter((r): r is string => r !== null)
    .map((r) => { try { const p = JSON.parse(r); return p.brief ? p as StoredBrief : null } catch { return null } })
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

function formatShootDate(dateStr: string) {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[parseInt(m) - 1]}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>
}) {
  const { pipeline: pipelineParam } = await searchParams
  const activePipeline = PIPELINES.find(p => p === pipelineParam) ?? null

  const allBriefs = await getAllBriefs()

  // Pipeline overview — counts per pipeline
  const pipelineStats = PIPELINES.map((p) => {
    const pBriefs = allBriefs.filter(b => b.brief.pipeline === p)
    const videos = pBriefs.flatMap(b => b.brief.videos.map(v => b.videoStatuses?.[v.id] ?? 'not-started'))
    const active = videos.filter(s => !isVideoDone(s)).length
    const done = videos.filter(s => isVideoDone(s)).length
    const amendments = videos.filter(s => s === 'amendments').length
    const inReview = videos.filter(s => s === 'in-review').length
    return { pipeline: p, total: videos.length, active, done, amendments, inReview }
  })

  // Filter briefs by selected pipeline
  const briefs = activePipeline
    ? allBriefs.filter(b => b.brief.pipeline === activePipeline)
    : allBriefs

  // Group by client
  const byClient = new Map<string, StoredBrief[]>()
  for (const b of briefs) {
    const client = b.brief.client || 'Unknown'
    if (!byClient.has(client)) byClient.set(client, [])
    byClient.get(client)!.push(b)
  }

  const activeClients: { client: string; briefs: StoredBrief[]; score: number }[] = []
  const doneClients: { client: string; briefs: StoredBrief[] }[] = []

  for (const [client, clientBriefs] of byClient) {
    const allStatuses = clientBriefs.flatMap(b =>
      b.brief.videos.map(v => b.videoStatuses?.[v.id] ?? 'not-started')
    )
    const allDone = allStatuses.length > 0 && allStatuses.every(isVideoDone)
    if (allDone) doneClients.push({ client, briefs: clientBriefs })
    else activeClients.push({ client, briefs: clientBriefs, score: urgencyScore(allStatuses) })
  }
  activeClients.sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-4 py-10 font-sans">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="rounded-2xl bg-[#4f1c1e] px-6 py-5 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#efff72]/70">Creative AI Media</p>
              <h1 className="font-heading text-4xl text-white">Edit Dashboard</h1>
              <p className="mt-1 text-sm text-white/60">
                {activeClients.length} active · {doneClients.length} completed
                {activePipeline ? ` — ${activePipeline}` : ' — All pipelines'}
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2 pt-1">
              <Link href="/" className="rounded-lg bg-[#efff72] px-3 py-1.5 text-xs font-semibold text-[#4f1c1e] hover:opacity-90 transition-opacity">
                + New Brief
              </Link>
              <Link href="/clients" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                Client Profiles
              </Link>
              <Link href="/calendar/manage" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                Content Calendar
              </Link>
            </div>
          </div>
        </div>

        {/* Pipeline overview */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pipelineStats.map(({ pipeline, total, active, done, amendments, inReview }) => {
            const isSelected = activePipeline === pipeline
            return (
              <Link
                key={pipeline}
                href={isSelected ? '/dashboard' : `/dashboard?pipeline=${encodeURIComponent(pipeline)}`}
                className={`rounded-2xl border px-4 py-3 transition-all ${
                  isSelected
                    ? 'border-[#4f1c1e] bg-[#4f1c1e] text-white shadow-md'
                    : 'border-gray-200 bg-white hover:border-[#4f1c1e]/40 hover:shadow-sm'
                }`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isSelected ? 'text-[#efff72]' : 'text-gray-700'}`}>
                  {pipeline}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{total}</p>
                  <p className={`text-xs font-semibold ${isSelected ? 'text-white/70' : 'text-gray-600'}`}>
                    {total === 0 ? 'NO VIDEOS' : `${active} ACTIVE · ${done} DONE`}
                  </p>
                </div>
                {(amendments > 0 || inReview > 0) && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {amendments > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'bg-orange-400/30 text-orange-200' : 'bg-orange-100 text-orange-800'}`}>
                        {amendments} amend
                      </span>
                    )}
                    {inReview > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'bg-purple-400/30 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
                        {inReview} review
                      </span>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {/* Active clients */}
        {activeClients.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-500">All caught up — no active edits.</p>
          </div>
        )}

        {activeClients.map(({ client, briefs: clientBriefs }) => (
          <div key={client} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Client header */}
            <div className="flex items-center justify-between bg-[#4f1c1e]/5 border-b border-gray-200 px-5 py-3">
              <h2 className="font-heading text-xl text-[#4f1c1e]">{client}</h2>
              <Link
                href={clientBriefs[0]?.briefUrl || `/brief/${clientBriefs[0]?.taskId}`}
                target="_blank"
                className="text-xs font-semibold text-[#4f1c1e] hover:underline"
              >
                Brief →
              </Link>
            </div>

            {/* All videos across all briefs for this client */}
            <div className="divide-y divide-gray-100">
              {clientBriefs
                .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
                .flatMap((stored) => {
                  const { brief, taskId, briefUrl, videoStatuses, videoAssetUrls } = stored
                  return brief.videos.map((v, i) => {
                    const s = (videoStatuses ?? {})[v.id] ?? 'not-started'
                    const assetUrl = videoAssetUrls?.[v.id]
                    const isDone = isVideoDone(s)
                    return (
                      <div key={`${taskId}-${v.id}`}
                        className={`flex items-start gap-3 px-5 py-3 ${isDone ? 'opacity-40' : ''}`}>
                        <span className={`mt-1 flex-shrink-0 h-2.5 w-2.5 rounded-full ${STATUS_DOT[s]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-bold uppercase tracking-wide ${isDone ? 'text-gray-400' : 'text-gray-500'}`}>
                              {v.format || 'TBD'}{v.duration ? ` · ${v.duration}` : ''}
                            </span>
                            {assetUrl && (
                              <a href={assetUrl} target="_blank" rel="noopener noreferrer"
                                className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 hover:bg-purple-200">
                                Asset ready →
                              </a>
                            )}
                          </div>
                          {v.angleObjective && (
                            <p className={`text-sm mt-0.5 leading-snug ${isDone ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-800 font-medium'}`}>
                              {v.angleObjective}
                            </p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 self-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_PILL[s]}`}>
                          {STATUS_LABEL[s]}
                        </span>
                      </div>
                    )
                  })
                })}
            </div>
          </div>
        ))}

        {/* Completed clients — collapsed */}
        {doneClients.length > 0 && (
          <details className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4 select-none hover:bg-gray-50 transition-colors">
              <span className="text-sm font-semibold text-gray-500">Completed — {doneClients.length} client{doneClients.length !== 1 ? 's' : ''}</span>
              <span className="text-xs text-gray-400">▸ Show</span>
            </summary>
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {doneClients.map(({ client, briefs: clientBriefs }) => (
                <div key={client} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="text-sm font-semibold text-gray-600">{client}</span>
                  <span className="text-xs text-gray-400">
                    {clientBriefs.reduce((n, b) => n + b.brief.videos.length, 0)} videos
                  </span>
                  <div className="ml-auto flex gap-2">
                    {clientBriefs.map(b => (
                      <Link key={b.taskId} href={b.briefUrl || `/brief/${b.taskId}`} target="_blank"
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:border-gray-400 transition-colors">
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
