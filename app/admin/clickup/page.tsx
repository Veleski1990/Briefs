'use client'

import { useState } from 'react'
import { CLIENT_OPTION_IDS, TYPE_OPTION_IDS } from '@/lib/constants'
import { CLIENTS } from '@/lib/constants'

const VIDEO_FORMATS = ['REEL', 'SHORT-FORM', 'STATIC', 'CAROUSEL', 'STORY', 'VSL']

interface FieldOption { id: string; name: string; orderindex: number }
interface Field { id: string; name: string; type: string; type_config?: { options?: FieldOption[] } }

export default function ClickUpAdminPage() {
  const [data, setData] = useState<Field[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFields = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/clickup-fields')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const json = await r.json()
      setData(json.fields ?? json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  const clientField = data?.find((f) => f.name.toUpperCase() === 'CLIENT')
  const typeField = data?.find((f) => f.name.toUpperCase() === 'TYPE')

  const clientOptions: FieldOption[] = clientField?.type_config?.options ?? []
  const typeOptions: FieldOption[] = typeField?.type_config?.options ?? []

  // Find missing clients (in CLIENTS constant but not in CLIENT_OPTION_IDS)
  const missingClients = CLIENTS.filter((c) => !CLIENT_OPTION_IDS[c])
  // Find missing formats
  const missingFormats = VIDEO_FORMATS.filter((f) => !TYPE_OPTION_IDS[f as keyof typeof TYPE_OPTION_IDS])

  return (
    <div className="min-h-screen bg-[#e4e2dd] px-4 py-10 font-sans">
      <div className="mx-auto max-w-3xl space-y-6">

        <div className="rounded-2xl bg-[#4f1c1e] px-6 py-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#efff72]/70">Admin</p>
          <h1 className="text-2xl font-bold text-white">ClickUp Field Sync</h1>
          <p className="mt-1 text-sm text-white/60">Find missing option IDs and update constants.ts</p>
        </div>

        {/* Missing items summary */}
        <div className="rounded-2xl bg-white border border-gray-200 px-5 py-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Currently Missing from constants.ts</h2>
          <div className="space-y-1">
            {missingClients.map((c) => (
              <div key={c} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">CLIENT: <strong>{c}</strong></span>
              </div>
            ))}
            {missingFormats.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">TYPE: <strong>{f}</strong></span>
              </div>
            ))}
            {missingClients.length === 0 && missingFormats.length === 0 && (
              <p className="text-sm text-green-600 font-semibold">All IDs are mapped.</p>
            )}
          </div>
        </div>

        {/* Fetch button */}
        <button
          onClick={fetchFields}
          disabled={loading}
          className="w-full rounded-2xl bg-[#4f1c1e] py-3 text-sm font-bold text-[#efff72] hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Fetching from ClickUp…' : 'Fetch live field options from ClickUp'}
        </button>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-700">{error}</div>
        )}

        {data && (
          <div className="space-y-4">
            {/* CLIENT options */}
            <div className="rounded-2xl bg-white border border-gray-200 px-5 py-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                CLIENT field options {clientField ? `(field ID: ${clientField.id})` : '— not found'}
              </h2>
              {clientOptions.length === 0 ? (
                <p className="text-sm text-gray-400">No options found</p>
              ) : (
                <div className="space-y-1">
                  {clientOptions.map((opt) => {
                    const inConstants = Object.values(CLIENT_OPTION_IDS).includes(opt.id)
                    const matchedKey = Object.entries(CLIENT_OPTION_IDS).find(([, v]) => v === opt.id)?.[0]
                    return (
                      <div key={opt.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${inConstants ? 'bg-green-50' : 'bg-orange-50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${inConstants ? 'bg-green-400' : 'bg-orange-400'}`} />
                        <span className="text-xs font-semibold text-gray-700 flex-1">{opt.name}</span>
                        <code className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 select-all">{opt.id}</code>
                        {!inConstants && (
                          <span className="text-[10px] text-orange-600 font-bold">MISSING</span>
                        )}
                        {inConstants && matchedKey && matchedKey !== opt.name && (
                          <span className="text-[10px] text-gray-400">→ {matchedKey}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* TYPE options */}
            <div className="rounded-2xl bg-white border border-gray-200 px-5 py-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                TYPE field options {typeField ? `(field ID: ${typeField.id})` : '— not found'}
              </h2>
              {typeOptions.length === 0 ? (
                <p className="text-sm text-gray-400">No options found</p>
              ) : (
                <div className="space-y-1">
                  {typeOptions.map((opt) => {
                    const inConstants = Object.values(TYPE_OPTION_IDS).includes(opt.id)
                    return (
                      <div key={opt.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${inConstants ? 'bg-green-50' : 'bg-orange-50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${inConstants ? 'bg-green-400' : 'bg-orange-400'}`} />
                        <span className="text-xs font-semibold text-gray-700 flex-1">{opt.name}</span>
                        <code className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 select-all">{opt.id}</code>
                        {!inConstants && (
                          <span className="text-[10px] text-orange-600 font-bold">MISSING</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {missingFormats.length > 0 && (
                <p className="mt-3 text-xs text-orange-600">
                  <strong>VSL</strong> and <strong>SHORT-FORM</strong> are not in the list above? You need to add those options in ClickUp first (Customize field → Add option), then re-fetch here.
                </p>
              )}
            </div>

            {/* Raw JSON */}
            <details className="rounded-2xl bg-white border border-gray-200 px-5 py-4 shadow-sm">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-gray-400">Raw field data (JSON)</summary>
              <pre className="mt-3 overflow-x-auto text-[10px] text-gray-600 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
            </details>
          </div>
        )}

        <a href="/dashboard" className="block text-center text-xs text-gray-400 underline hover:text-gray-600 pb-4">← Back to Dashboard</a>
      </div>
    </div>
  )
}
