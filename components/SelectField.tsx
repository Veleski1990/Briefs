import FieldLabel from './FieldLabel'

interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  required?: boolean
  hint?: string
  placeholder?: string
}

export default function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  required,
  hint,
  placeholder = 'Select…',
}: SelectFieldProps) {
  return (
    <div>
      <FieldLabel label={label} htmlFor={id} required={required} hint={hint} />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2.5 text-sm text-brand-text focus:border-brand-maroon focus:outline-none focus:ring-1 focus:ring-brand-maroon transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}
