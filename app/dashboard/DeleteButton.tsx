'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteButton({ taskId }: { taskId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/brief/${taskId}`, { method: 'DELETE' })
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Sure?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          {deleting ? '…' : 'Delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400 hover:border-red-200 hover:text-red-500 transition-colors"
    >
      Delete
    </button>
  )
}
