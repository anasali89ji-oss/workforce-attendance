import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export default async function RootPage() {
  try {
    const { data: tenants } = await supabaseAdmin
      .from('tenants').select('id').limit(1)

    if (!tenants || tenants.length === 0) {
      redirect('/setup')
    }

    const { data: state } = await supabaseAdmin
      .from('setup_wizard_state')
      .select('is_complete')
      .eq('tenant_id', tenants[0].id)
      .single()

    if (!state?.is_complete) {
      redirect('/setup')
    }

    const cookieStore = await cookies()
    const userId = cookieStore.get('workforce_user_id')?.value
    if (!userId) redirect('/login')

    redirect('/dashboard')
  } catch {
    redirect('/setup')
  }
}
