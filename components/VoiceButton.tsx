'use client'

import { useState, useRef, useCallback } from 'react'
import type { BriefFormData } from '@/lib/types'

interface VoiceButtonProps {
  onFill: (data: Partial<BriefFormData>) => void
}

type State = 'idle' | 'listening' | 'processing' | 'done' | 'error'

export default function VoiceButton({ onFill }: VoiceButtonProps) {
  const [state, setState] = useState<State>('idle')
  const [transcript, setTranscript] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setErrorMsg('Voice input is not supported in this browser. Use Chrome.')
      setState('error')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-AU'

    let finalTranscript = ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += t + ' '
        } else {
          interim += t
        }
      }
      setTranscript((finalTranscript + interim).trim())
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setErrorMsg(`Mic error: ${event.error}`)
      setState('error')
    }

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        processTranscript(finalTranscript.trim())
      } else {
        setState('idle')
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setState('listening')
    setTranscript('')
    setErrorMsg('')
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const processTranscript = async (text: string) => {
    setState('processing')
    try {
      const res = await fetch('/api/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const json = await res.json()
      if (json.data) {
        onFill(json.data)
        setState('done')
        setTimeout(() => setState('idle'), 3000)
      } else {
        setErrorMsg(json.error || 'Could not parse transcript.')
        setState('error')
      }
    } catch {
      setErrorMsg('Network error — please try again.')
      setState('error')
    }
  }

  const handleClick = () => {
    if (state === 'listening') {
      stopListening()
    } else if (state === 'idle' || state === 'done' || state === 'error') {
      startListening()
    }
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleClick}
          disabled={state === 'processing'}
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-xl transition-all disabled:opacity-50 ${
            state === 'listening'
              ? 'animate-pulse bg-red-600 text-white shadow-lg shadow-red-600/40'
              : state === 'processing'
              ? 'bg-brand-maroon text-brand-accent'
              : state === 'done'
              ? 'bg-green-600 text-white'
              : state === 'error'
              ? 'bg-red-100 text-red-600'
              : 'bg-brand-maroon text-brand-accent hover:opacity-90'
          }`}
        >
          {state === 'listening' ? '⏹' : state === 'processing' ? '⏳' : state === 'done' ? '✓' : '🎙'}
        </button>

        <div className="flex-1 min-w-0">
          {state === 'idle' && (
            <>
              <p className="text-sm font-semibold text-brand-text">Fill by voice</p>
              <p className="text-xs text-brand-muted">Tap the mic and describe the brief naturally. Claude will fill the form.</p>
            </>
          )}
          {state === 'listening' && (
            <>
              <p className="text-sm font-semibold text-red-600">Listening… tap to stop</p>
              <p className="truncate text-xs text-brand-muted italic">{transcript || 'Start speaking…'}</p>
            </>
          )}
          {state === 'processing' && (
            <>
              <p className="text-sm font-semibold text-brand-maroon">Filling form…</p>
              <p className="text-xs text-brand-muted">Claude is reading your brief</p>
            </>
          )}
          {state === 'done' && (
            <>
              <p className="text-sm font-semibold text-green-600">Done! Form filled.</p>
              <p className="text-xs text-brand-muted">Check the fields and adjust anything that needs fixing.</p>
            </>
          )}
          {state === 'error' && (
            <>
              <p className="text-sm font-semibold text-red-600">Something went wrong</p>
              <p className="text-xs text-red-500">{errorMsg}</p>
              <button type="button" onClick={() => setState('idle')} className="mt-1 text-xs underline text-brand-muted">Try again</button>
            </>
          )}
        </div>
      </div>

      {transcript && state === 'listening' && (
        <div className="mt-3 rounded-lg bg-brand-surface-2 px-3 py-2 text-xs text-brand-text-dim italic border border-brand-border">
          {transcript}
        </div>
      )}
    </div>
  )
}
