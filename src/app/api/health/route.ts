import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const start = Date.now()
    const { error } = await supabaseAdmin.from('tenants').select('id').limit(1)
    const dbLatency = Date.now() - start

    if (error) throw error

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      services: {
        database: dbLatency < 1000 ? 'healthy' : 'degraded',
        database_latency_ms: dbLatency,
      },
    })
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString(), error: 'Database connection failed' },
      { status: 503 }
    )
  }
}
