interface SectionHeadingProps {
  title: string
  description?: string
}

export default function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="mb-5 border-b border-brand-border pb-3">
      <h2 className="text-base font-semibold text-brand-dark">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-brand-muted">{description}</p>
      )}
    </div>
  )
}
