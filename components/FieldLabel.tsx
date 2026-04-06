interface FieldLabelProps {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
}

export default function FieldLabel({ label, htmlFor, required, hint }: FieldLabelProps) {
  return (
    <div className="mb-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-widest text-brand-muted"
      >
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-brand-muted">{hint}</p>}
    </div>
  )
}
