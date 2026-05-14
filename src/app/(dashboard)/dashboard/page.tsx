import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth.server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { SkeletonKpi, SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="page">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient user={user} />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="skeleton h-10 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKpi key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
      <SkeletonTable rows={5} cols={5} />
    </div>
  )
}
