'use client'

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface RealtimeEvent {
  event: string
  table: string
  callback: (payload: unknown) => void
}

export function useRealtime(channel: string, events: RealtimeEvent[]) {
  // Use ref so we never re-subscribe when events array identity changes
  const eventsRef = useRef(events)
  eventsRef.current = events

  const handlePayload = useCallback((payload: Record<string, unknown>) => {
    const match = eventsRef.current.find(
      e => e.table === payload['table'] && (e.event === '*' || e.event === payload['eventType'])
    )
    if (match) match.callback(payload)
  }, [])

  useEffect(() => {
    if (!supabase) return

    const subscription = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        handlePayload
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Channel error on: ${channel}`)
        }
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [channel, handlePayload]) // events NOT in deps — ref handles it
}
