import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function HomePage() {
  const cookieStore = await cookies()
  const hasSession = cookieStore.has('workforce_session_token')

  if (hasSession) {
    redirect('/dashboard')
  }

  redirect('/login')
}
