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
    const channel = supabase.channel('global')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        setLastEvent({ type: `${payload.table}:${payload.eventType}`, payload })
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export const useRealtimeContext = () => useContext(RealtimeContext)
