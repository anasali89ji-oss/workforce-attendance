'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtime(
  channel: string,
  events: { event: string; table: string; callback: (payload: unknown) => void }[]
) {
  // Store callbacks in a ref so the effect doesn't re-run when they change identity.
  // The events array is typically an inline literal which creates a new object every render —
  // putting it in the effect deps would cause infinite subscribe/unsubscribe loops.
  const eventsRef = useRef(events)
  useEffect(() => { eventsRef.current = events })

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel> | null = null
    try {
      subscription = supabase
        .channel(channel)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            const match = eventsRef.current.find(
              e => e.table === payload.table && (e.event === '*' || e.event === payload.eventType)
            )
            if (match) match.callback(payload)
          }
        )
        .subscribe()
    } catch (err) {
      console.warn('[useRealtime] Supabase realtime unavailable:', err)
    }

    return () => {
      if (subscription) subscription.unsubscribe().catch(() => {})
    }
  }, [channel]) // Only re-run if channel name changes, NOT the events array
}
