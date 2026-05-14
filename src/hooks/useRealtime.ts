'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtime(
  channel: string,
  events: { event: string; table: string; callback: (payload: unknown) => void }[]
) {
  useEffect(() => {
    const subscription = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const match = events.find(e => e.table === payload.table && (e.event === '*' || e.event === payload.eventType))
          if (match) match.callback(payload)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [channel, events])
}
