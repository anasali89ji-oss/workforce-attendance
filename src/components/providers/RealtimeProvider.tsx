'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface RealtimeContextType {
  isConnected: boolean
  lastEvent: { type: string; payload: unknown } | null
}

const RealtimeContext = createContext<RealtimeContextType>({ isConnected: false, lastEvent: null })

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<{ type: string; payload: unknown } | null>(null)

  useEffect(() => {
    // Guard: if NEXT_PUBLIC_SUPABASE_* env vars are missing the Proxy throws.
    // Wrap in try-catch so the entire dashboard doesn't crash — realtime is non-critical.
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel('global')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          setLastEvent({ type: `${payload.table}:${payload.eventType}`, payload })
        })
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED')
        })
    } catch (err) {
      // Realtime unavailable (e.g. NEXT_PUBLIC_SUPABASE_URL not set) — degrade gracefully
      console.warn('[RealtimeProvider] Supabase realtime unavailable:', err)
    }

    return () => {
      if (channel) channel.unsubscribe().catch(() => {})
    }
  }, []) // Empty deps — only subscribe once on mount

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export const useRealtimeContext = () => useContext(RealtimeContext)
