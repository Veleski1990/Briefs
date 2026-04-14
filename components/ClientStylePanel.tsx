'use client'

interface ClientProfile {
  musicStyle: string
  editingPace: string
  colourCodes: string
  captionFont: string
  captionFontImageUrl: string
  overlayFont: string
  overlayFontImageUrl: string
  dos: string[]
  donts: string[]
  generalNotes: string
}

interface ClientStylePanelProps {
  client: string
  profile: ClientProfile | null
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <span className="w-32 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-brand-muted">{label}</span>
      <span className="text-sm text-brand-text">{value}</span>
    </div>
  )
}

function ImageRow({ label, url }: { label: string; url: string }) {
  if (!url) return null
  return (
    <div className="flex gap-3">
      <span className="w-32 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-brand-muted">{label}</span>
      <img
        src={url}
        alt={label}
        className="max-h-28 rounded border border-brand-border object-contain bg-gray-50"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

export default function ClientStylePanel({ client, profile }: ClientStylePanelProps) {
  const isEmpty =
    !profile ||
    (!profile.musicStyle &&
      !profile.editingPace &&
      !profile.colourCodes &&
      !profile.captionFont &&
      !profile.captionFontImageUrl &&
      !profile.overlayFont &&
      !profile.overlayFontImageUrl &&
      !profile.generalNotes &&
      profile.dos.length === 0 &&
      profile.donts.length === 0)

  return (
    <div className="mt-3 rounded-lg border border-brand-border bg-brand-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-maroon">
          {client} — Style Guide
        </p>
        <a
          href={`/clients?edit=${encodeURIComponent(client)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-muted underline hover:text-brand-maroon"
        >
          {isEmpty ? '+ Add style guide' : 'Edit'}
        </a>
      </div>

      {isEmpty ? (
        <p className="text-sm text-brand-muted italic">
          No style guide set for this client yet.{' '}
          <a
            href={`/clients?edit=${encodeURIComponent(client)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-brand-maroon"
          >
            Add one →
          </a>
        </p>
      ) : (
        <div className="space-y-2">
          <Row label="Music" value={profile.musicStyle} />
          <Row label="Pacing" value={profile.editingPace} />
          <Row label="Colour Codes" value={profile.colourCodes} />
          <Row label="Caption Font" value={profile.captionFont} />
          <ImageRow label="Caption Ref" url={profile.captionFontImageUrl} />
          <Row label="Overlay Font" value={profile.overlayFont} />
          <ImageRow label="Overlay Ref" url={profile.overlayFontImageUrl} />
          {profile.dos.length > 0 && (
            <div className="flex gap-3">
              <span className="w-32 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-brand-muted">Do</span>
              <ul className="space-y-0.5">
                {profile.dos.map((d, i) => (
                  <li key={i} className="text-sm text-brand-text">✓ {d}</li>
                ))}
              </ul>
            </div>
          )}
          {profile.donts.length > 0 && (
            <div className="flex gap-3">
              <span className="w-32 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-brand-muted">Don't</span>
              <ul className="space-y-0.5">
                {profile.donts.map((d, i) => (
                  <li key={i} className="text-sm text-red-600">✗ {d}</li>
                ))}
              </ul>
            </div>
          )}
          {profile.generalNotes && (
            <div className="flex gap-3">
              <span className="w-32 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-brand-muted">Notes</span>
              <span className="text-sm text-brand-text">{profile.generalNotes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
