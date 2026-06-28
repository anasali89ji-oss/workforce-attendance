import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export default async function HomePage() {
  // Check if setup has been completed first
  const tenant = await prisma.tenant.findFirst({ select: { id: true } }).catch(() => null)
  if (!tenant) redirect('/setup')

  const setupState = await prisma.setupWizardState.findFirst({
    where: { tenant_id: tenant.id },
    select: { is_complete: true },
  }).catch(() => null)
  if (!setupState?.is_complete) redirect('/setup')

  const cookieStore = await cookies()
  const hasSession = cookieStore.has('workforce_session_token')

  if (hasSession) {
    redirect('/dashboard')
  }

  redirect('/login')
}
