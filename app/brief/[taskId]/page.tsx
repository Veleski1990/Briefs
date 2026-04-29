import { getRedis } from '@/lib/redis'
import type { StoredBrief, VideoRow, BriefStatus, ClientProfile } from '@/lib/types'
import { FUNNEL_STAGE_DESCRIPTIONS } from '@/lib/constants'
import { notFound } from 'next/navigation'
import { VideoStatusButton, BulkStatusBar } from './StatusControls'
import SubmitAssetButton from './SubmitAssetButton'

export const dynamic = 'force-dynamic'

async function getStoredBrief(taskId: string): Promise<StoredBrief | null> {
  const redis = await getRedis()
  if (!redis) return null
  const raw = await redis.get(`brief:${taskId}`)
  await redis.quit()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    // Handle old format (plain BriefFormData, no .brief wrapper)
    if (!parsed.brief) {
      return {
        brief: parsed,
        taskId,
        taskUrl: '',
        briefUrl: '',
        submittedAt: '',
        videoStatuses: {},
        videoSubtaskIds: {},
        clientProfile: null,
      }
    }
    return parsed as StoredBrief
  } catch {
    return null
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[parseInt(m) - 1]} ${y}`
}

function ExternalLink({ href, label }: { href: string; label?: string }) {
  if (!href?.trim() || href === '—') return <span className="text-gray-400">—</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#4f1c1e] underline underline-offset-2 hover:opacity-70 break-all"
    >
      {label || href}
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  )
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
  const display = value?.trim() || null
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 leading-snug">{display || <span className="text-gray-400">—</span>}</p>
    </div>
  )
}

function LinkField({ label, value }: { label: string; value: string | undefined | null }) {
  const display = value?.trim() || null
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      {display ? <ExternalLink href={display} /> : <span className="text-gray-400 text-sm">—</span>}
    </div>
  )
}

function MultiLinkField({ label, value }: { label: string; value: string | undefined | null }) {
  const links = (value || '').split('\n').map((l) => l.trim()).filter(Boolean)
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      {links.length === 0 ? (
        <span className="text-gray-400 text-sm">—</span>
      ) : (
        <div className="space-y-1">
          {links.map((link, i) => (
            <div key={i}><ExternalLink href={link} label={links.length > 1 ? `Link ${i + 1}` : link} /></div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClientProfileCard({ client, profile }: { client: string; profile: ClientProfile | null }) {
  const isEmpty =
    !profile ||
    (!profile.musicStyle && !profile.editingPace && !profile.colourCodes &&
      !profile.captionFont && (!profile.captionFontImageUrls || profile.captionFontImageUrls.length === 0) &&
      !profile.overlayFont && (!profile.overlayFontImageUrls || profile.overlayFontImageUrls.length === 0) &&
      !profile.logoUrl && !profile.generalNotes &&
      (!profile.dos || profile.dos.length === 0) &&
      (!profile.donts || profile.donts.length === 0))

  if (isEmpty) return null

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200">
      <div className="border-b border-gray-100 px-5 py-3.5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">
          {client} — Style Guide
        </h2>
      </div>
      <div className="px-5 py-4 space-y-2.5">
        {profile!.logoUrl && (
          <div className="flex gap-3 items-start">
            <span className="w-24 flex-shrink-0 text-[11px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">Logo</span>
            <img src={profile!.logoUrl} alt="Brand logo" className="max-h-16 max-w-[140px] rounded-lg border border-gray-200 object-contain bg-gray-50 p-1" />
          </div>
        )}
        {profile!.musicStyle && <ProfileRow label="Music" value={profile!.musicStyle} />}
        {profile!.editingPace && <ProfileRow label="Pacing" value={profile!.editingPace} />}
        {profile!.colourCodes && <ProfileRow label="Colour Codes" value={profile!.colourCodes} />}
        {profile!.captionFont && <ProfileRow label="Caption Font" value={profile!.captionFont} />}
        {(profile!.captionFontImageUrls ?? []).length > 0 && (
          <div className="flex gap-3">
            <span className="w-24 flex-shrink-0 text-[11px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">Caption Ref</span>
            <div className="flex flex-wrap gap-2">
              {profile!.captionFontImageUrls.map((url, i) => (
                <img key={i} src={url} alt={`Caption ref ${i + 1}`} className="max-h-48 rounded-lg border border-gray-200 object-contain bg-gray-50" />
              ))}
            </div>
          </div>
        )}
        {profile!.overlayFont && <ProfileRow label="Overlay Font" value={profile!.overlayFont} />}
        {(profile!.overlayFontImageUrls ?? []).length > 0 && (
          <div className="flex gap-3">
            <span className="w-24 flex-shrink-0 text-[11px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">Overlay Ref</span>
            <div className="flex flex-wrap gap-2">
              {profile!.overlayFontImageUrls.map((url, i) => (
                <img key={i} src={url} alt={`Overlay ref ${i + 1}`} className="max-h-48 rounded-lg border border-gray-200 object-contain bg-gray-50" />
              ))}
            </div>
          </div>
        )}
        {profile!.dos && profile!.dos.length > 0 && (
          <div className="flex gap-3">
            <span className="w-24 flex-shrink-0 text-[11px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">Do</span>
            <ul className="space-y-0.5">
              {profile!.dos.map((d, i) => (
                <li key={i} className="text-sm text-gray-800">✓ {d}</li>
              ))}
            </ul>
          </div>
        )}
        {profile!.donts && profile!.donts.length > 0 && (
          <div className="flex gap-3">
            <span className="w-24 flex-shrink-0 text-[11px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">Don't</span>
            <ul className="space-y-0.5">
              {profile!.donts.map((d, i) => (
                <li key={i} className="text-sm text-red-600">✗ {d}</li>
              ))}
            </ul>
          </div>
        )}
        {profile!.generalNotes && <ProfileRow label="Notes" value={profile!.generalNotes} />}
      </div>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 flex-shrink-0 text-[11px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  )
}

const STATUS_COLOURS: Record<BriefStatus, string> = {
  'not-started': 'bg-gray-100 text-gray-500',
  'in-edit': 'bg-blue-100 text-blue-700',
  'amendments': 'bg-orange-100 text-orange-700',
  'in-review': 'bg-purple-100 text-purple-700',
  'approved': 'bg-green-100 text-green-700',
  'scheduled': 'bg-teal-100 text-teal-700',
}
const STATUS_LABELS: Record<BriefStatus, string> = {
  'not-started': 'Not Started',
  'in-edit': 'In Edit',
  'amendments': 'Amendments',
  'in-review': 'In Review',
  'approved': 'Approved',
  'scheduled': 'Scheduled',
}

function VideoCard({
  video,
  index,
  taskId,
  status,
  assetUrl,
}: {
  video: VideoRow
  index: number
  taskId: string
  status: BriefStatus
  assetUrl?: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header with title + status controls */}
      <div className="bg-[#4f1c1e] px-5 py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#efff72] text-base">Video {index + 1}</h3>
            {video.format && (
              <span className="rounded-full bg-[#efff72]/20 px-2.5 py-0.5 text-xs font-semibold text-[#efff72]">
                {video.format}
              </span>
            )}
            {video.duration && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/80">
                {video.duration}
              </span>
            )}
            {video.deadline && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/80">
                Due: {formatDate(video.deadline)}
              </span>
            )}
          </div>
        </div>
        {/* Status controls */}
        <div className="mt-3 border-t border-white/10 pt-3">
          <VideoStatusButton taskId={taskId} videoId={video.id} initialStatus={status} />
        </div>
        {/* Editor asset submission */}
        <SubmitAssetButton taskId={taskId} videoId={video.id} existingUrl={assetUrl} />
      </div>

      <div className="divide-y divide-gray-100">
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          <Field label="Angle / Objective" value={video.angleObjective} />
          <Field label="Hook (first 3s)" value={video.hook} />
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 bg-gray-50">
          <MultiLinkField label="A-Roll Footage" value={video.aRollLinks || (video as VideoRow & { footageLink?: string }).footageLink || ''} />
          <MultiLinkField label="B-Roll Footage" value={video.bRollLinks || ''} />
          <LinkField label="Script" value={video.scriptLink} />
          <LinkField label="Music" value={video.musicLink} />
        </div>
        {(video.textOverlays || video.specialNotes) && (
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            {video.textOverlays && <Field label="Text Overlays" value={video.textOverlays} />}
            {video.specialNotes && <Field label="Special Notes" value={video.specialNotes} />}
          </div>
        )}
      </div>
    </div>
  )
}

function Badge({ label, colour }: { label: string; colour: 'maroon' | 'lime' | 'gray' }) {
  const styles = {
    maroon: 'bg-[#4f1c1e] text-[#efff72]',
    lime: 'bg-[#efff72] text-[#4f1c1e]',
    gray: 'bg-gray-100 text-gray-700',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[colour]}`}>{label}</span>
}

async function getLiveClientProfile(clientName: string): Promise<ClientProfile | null> {
  const redis = await getRedis()
  if (!redis) return null
  const raw = await redis.get('client-profiles')
  await redis.quit()
  if (!raw) return null
  try {
    const profiles = JSON.parse(raw)
    const p = profiles[clientName]
    if (!p) return null
    // Migrate old field names saved before the font schema change
    if (p.fonts && !p.captionFont) { p.captionFont = p.fonts; delete p.fonts }
    if (p.textStyleImageUrl && !p.captionFontImageUrls) { p.captionFontImageUrls = [p.textStyleImageUrl]; delete p.textStyleImageUrl }
    if (typeof p.captionFontImageUrl === 'string') { p.captionFontImageUrls = p.captionFontImageUrl ? [p.captionFontImageUrl] : []; delete p.captionFontImageUrl }
    if (typeof p.overlayFontImageUrl === 'string') { p.overlayFontImageUrls = p.overlayFontImageUrl ? [p.overlayFontImageUrl] : []; delete p.overlayFontImageUrl }
    if (!p.captionFontImageUrls) p.captionFontImageUrls = []
    if (!p.overlayFontImageUrls) p.overlayFontImageUrls = []
    if (!p.overlayFont) p.overlayFont = ''
    if (!p.logoUrl) p.logoUrl = ''
    return p as ClientProfile
  } catch {
    return null
  }
}

export default async function BriefPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const stored = await getStoredBrief(taskId)
  if (!stored) notFound()

  const { brief, videoStatuses, videoSubtaskIds, taskUrl, submittedAt } = stored

  // Always fetch live profile so changes in /clients are immediately reflected
  const clientProfile = await getLiveClientProfile(brief.client)
  const funnelDesc = brief.funnelStage ? FUNNEL_STAGE_DESCRIPTIONS[brief.funnelStage] : null

  // Overall progress
  const total = brief.videos.length
  const DONE_STATUSES: BriefStatus[] = ['approved', 'scheduled']
  const doneCount = Object.values(videoStatuses).filter((s) => DONE_STATUSES.includes(s)).length
  const amendCount = Object.values(videoStatuses).filter((s) => s === 'amendments').length

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-4 py-10 font-sans text-gray-900">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* ── HEADER ── */}
        <div className="overflow-hidden rounded-2xl bg-[#4f1c1e] shadow-lg">
          <div className="px-6 pt-6 pb-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#efff72]/70">
              Creative AI Media — Editor Brief
            </p>
            <h1 className="text-3xl font-bold text-white">{brief.client}</h1>
            <p className="mt-1 text-sm text-white/70">
              Shoot date: {formatDate(brief.shootDate)}
              {brief.assignedEditor && <span className="ml-3 opacity-70">· Editor: {brief.assignedEditor}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-6 py-3.5">
            {brief.pipeline && <Badge label={brief.pipeline} colour="lime" />}
            {brief.platform && <Badge label={brief.platform} colour="gray" />}
            {brief.funnelStage && (
              <Badge
                label={`${brief.funnelStage} — ${brief.funnelStage === 'TOF' ? 'Awareness' : brief.funnelStage === 'MOF' ? 'Social Proof' : 'Conversion'}`}
                colour="gray"
              />
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-white/50">
                {doneCount}/{total} done{amendCount > 0 ? ` · ${amendCount} amendments` : ''}
              </span>
              {submittedAt && (
                <span className="text-xs text-white/40">
                  {new Date(submittedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              )}
              <a
                href={`/brief/${taskId}/edit`}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Edit Brief
              </a>
            </div>
          </div>
        </div>

        {/* ── CLIENT STYLE GUIDE ── */}
        <ClientProfileCard client={brief.client} profile={clientProfile} />

        {/* ── SHOOT CONTEXT ── */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Shoot Context</h2>
          </div>
          <div className="space-y-4 px-5 py-4">
            {brief.clientBriefLink && (
              <div>
                <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Client Brief</p>
                <ExternalLink href={brief.clientBriefLink} label="Open client brief doc" />
              </div>
            )}
            <Field label="What Was Filmed" value={brief.whatWasFilmed} />
            <Field label="Location / Vibe" value={brief.locationVibe} />
            <Field label="Shoot Objective" value={brief.shootObjective} />
            {funnelDesc && (
              <div className="rounded-xl border border-[#4f1c1e]/20 bg-[#4f1c1e]/5 px-4 py-3">
                <p className="text-xs font-semibold text-[#4f1c1e] mb-0.5">Funnel Stage: {brief.funnelStage}</p>
                <p className="text-sm text-gray-700 leading-snug">{funnelDesc}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── VIDEOS ── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">
              Videos ({brief.videos.length})
            </h2>
            <div className="rounded-xl bg-[#4f1c1e] px-4 py-2.5">
              <BulkStatusBar taskId={taskId} videoIds={brief.videos.map((v) => v.id)} />
            </div>
          </div>
          {brief.videos.map((video, i) => (
            <VideoCard
              key={video.id}
              video={video}
              index={i}
              taskId={taskId}
              status={videoStatuses?.[video.id] ?? 'in-edit'}
              assetUrl={stored.videoAssetUrls?.[video.id]}
            />
          ))}
        </div>

        {/* ── REFERENCE VIDEOS ── */}
        {brief.referenceLinks?.trim() && (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-100 px-5 py-3.5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">Reference Videos</h2>
            </div>
            <div className="px-5 py-4 space-y-1.5">
              {brief.referenceLinks.split('\n').filter(Boolean).map((link, i) => (
                <div key={i}><ExternalLink href={link.trim()} /></div>
              ))}
            </div>
          </div>
        )}

        {/* ── GENERAL INSTRUCTIONS ── */}
        {brief.generalInstructions?.trim() && (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-100 px-5 py-3.5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#4f1c1e]">General Instructions</h2>
            </div>
            <div className="px-5 py-4">
              <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{brief.generalInstructions}</p>
            </div>
          </div>
        )}

        {/* ── CLICKUP LINK ── */}
        {taskUrl && (
          <div className="pb-2 text-center">
            <a
              href={taskUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 underline hover:text-gray-600"
            >
              View in ClickUp →
            </a>
          </div>
        )}

        <p className="pb-4 text-center text-xs text-gray-400">Creative AI Media · Editor Brief System</p>
      </div>
    </div>
  )
}
