import FieldLabel from './FieldLabel'

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  hint?: string
  placeholder?: string
  multiline?: boolean
  rows?: number
  type?: string
}

export default function TextField({
  id,
  label,
  value,
  onChange,
  required,
  hint,
  placeholder,
  multiline,
  rows = 3,
  type = 'text',
}: TextFieldProps) {
  const baseClass =
    'w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2.5 text-sm text-brand-text placeholder-brand-taupe focus:border-brand-maroon focus:outline-none focus:ring-1 focus:ring-brand-maroon transition-colors'

  return (
    <div>
      <FieldLabel label={label} htmlFor={id} required={required} hint={hint} />
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${baseClass} resize-y`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
    </div>
  )
}
