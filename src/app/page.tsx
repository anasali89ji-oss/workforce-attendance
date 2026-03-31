export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export default async function RootPage() {
  try {
    const { data: tenants } = await supabaseAdmin
      .from('tenants').select('id').limit(1)

    if (!tenants || tenants.length === 0) redirect('/setup')

    const { data: state } = await supabaseAdmin
      .from('setup_wizard_state')
      .select('is_complete')
      .eq('tenant_id', tenants[0].id)
      .single()

    if (!state?.is_complete) redirect('/setup')

    const user = await getCurrentUser()
    if (!user) redirect('/login')
    redirect('/dashboard')
  } catch {
    redirect('/login')
  }
}
