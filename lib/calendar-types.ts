export type PostFormat = 'REEL' | 'SHORT-FORM' | 'STATIC' | 'CAROUSEL' | 'STORY' | 'VSL'
export type PostStatus = 'draft' | 'pending' | 'approved' | 'changes-requested' | 'scheduled'
export type PostCategory = 'founder' | 'product' | 'lifestyle' | 'educational' | 'testimonial' | 'promotional' | 'other'

export interface CalendarPost {
  id: string
  clientSlug: string
  title: string
  format: PostFormat
  category: PostCategory
  scheduledDate: string   // YYYY-MM-DD
  previewUrl?: string     // direct image/video URL or Frame.io review link
  caption?: string        // post caption / copy to show client
  notes?: string          // internal notes (not shown to client)
  status: PostStatus
  clientNote?: string     // feedback from client when requesting changes
  respondedAt?: string    // ISO timestamp of last client approval/rejection
  createdAt: string
  briefTaskId?: string    // optional link back to a brief
}

export const CATEGORY_COLOURS: Record<PostCategory, { bg: string; text: string; dot: string }> = {
  founder:      { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400' },
  product:      { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  lifestyle:    { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  educational:  { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  testimonial:  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
  promotional:  { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-400' },
  other:        { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
}

// Status drives all colours — category is shown as small text only
export const STATUS_COLOURS: Record<PostStatus, { bg: string; text: string; dot: string; label: string }> = {
  draft:               { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400',  label: 'Draft' },
  pending:             { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-400',     label: 'Pending Approval' },
  'changes-requested': { bg: 'bg-red-200',    text: 'text-red-900',    dot: 'bg-red-600',     label: 'Changes Requested' },
  approved:            { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500',   label: 'Approved' },
  scheduled:           { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500',  label: 'Scheduled / Posted' },
}

// Keep STATUS_STYLES as alias for backwards compat (badge colours on manage page)
export const STATUS_STYLES: Record<PostStatus, { label: string; colour: string }> = {
  draft:               { label: 'Draft',              colour: 'bg-yellow-100 text-yellow-700' },
  pending:             { label: 'Pending Approval',   colour: 'bg-red-100 text-red-700' },
  'changes-requested': { label: 'Changes Requested',  colour: 'bg-red-200 text-red-900' },
  approved:            { label: 'Approved',            colour: 'bg-green-100 text-green-700' },
  scheduled:           { label: 'Scheduled / Posted',  colour: 'bg-purple-100 text-purple-700' },
}

export function clientToSlug(client: string): string {
  return client.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function slugToDisplay(slug: string): string {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
