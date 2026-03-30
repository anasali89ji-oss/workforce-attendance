import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getDashboardData(tenantId: string) {
  const today = new Date().toISOString().split('T')[0]

  const [{ count: total }, { data: todayLogs }, { count: pendingLeaves }, { data: announcements }] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
    supabaseAdmin.from('attendance_logs').select('status, user_id, clock_in, clock_out').eq('tenant_id', tenantId).eq('date', today),
    supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
    supabaseAdmin.from('announcements').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(3),
  ])

  const present = todayLogs?.filter(l => ['present','late'].includes(l.status)).length || 0
  const late = todayLogs?.filter(l => l.status === 'late').length || 0
  const onLeave = todayLogs?.filter(l => l.status === 'on_leave').length || 0
  const absent = Math.max(0, (total || 0) - present - onLeave)

  return { total: total || 0, present, late, onLeave, absent, pendingLeaves: pendingLeaves || 0, announcements: announcements || [], attendanceRate: total ? Math.round((present / (total || 1)) * 100) : 0 }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getDashboardData(user.tenant_id)
  const today = new Date().toISOString().split('T')[0]

  // Check if user has clocked in
  const { data: myLog } = await supabaseAdmin
    .from('attendance_logs').select('clock_in, clock_out, status').eq('user_id', user.id).eq('date', today).single()

  const stats = [
    { label: 'Total Employees', value: data.total, color: 'bg-blue-500', icon: '👥' },
    { label: 'Present Today', value: data.present, color: 'bg-green-500', icon: '✅' },
    { label: 'Absent Today', value: data.absent, color: 'bg-red-500', icon: '❌' },
    { label: 'Late Arrivals', value: data.late, color: 'bg-yellow-500', icon: '⚠️' },
    { label: 'On Leave', value: data.onLeave, color: 'bg-purple-500', icon: '🏖️' },
    { label: 'Pending Leaves', value: data.pendingLeaves, color: 'bg-orange-500', icon: '📋' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {getGreeting()}, {user.first_name}! 👋</h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening at {user.tenant?.name} today.</p>
      </div>

      {/* Clock In/Out Card */}
      <ClockCard myLog={myLog} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${stat.color} bg-opacity-10 rounded-lg flex items-center justify-center text-lg mb-3`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance rate */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900">Today&apos;s Attendance Rate</h3>
          <span className="text-2xl font-bold text-indigo-600">{data.attendanceRate}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-3 bg-indigo-600 rounded-full transition-all" style={{ width: `${data.attendanceRate}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{data.present} present</span>
          <span>{data.total} total</span>
        </div>
      </div>

      {/* Announcements */}
      {data.announcements.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">📢 Announcements</h3>
          <div className="space-y-3">
            {data.announcements.map((a: { id: string; title: string; content: string; priority: string; created_at: string }) => (
              <div key={a.id} className="p-3 rounded-lg bg-gray-50 border-l-4 border-indigo-500">
                <div className="font-medium text-sm text-gray-900">{a.title}</div>
                <div className="text-xs text-gray-500 mt-1">{a.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function ClockCard({ myLog }: { myLog: { clock_in?: string; clock_out?: string; status?: string } | null }) {
  const clockedIn = !!myLog?.clock_in
  const clockedOut = !!myLog?.clock_out

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">
            {!clockedIn ? "You haven't clocked in yet" : clockedOut ? 'You\'ve completed today\'s shift' : `Clocked in at ${formatTime(myLog?.clock_in)}`}
          </div>
          <div className="text-indigo-200 text-sm mt-1">
            {clockedOut ? `Clocked out at ${formatTime(myLog?.clock_out)}` : clockedIn ? 'Currently on duty' : 'Clock in to start tracking'}
          </div>
        </div>
        <AttendanceButton clockedIn={clockedIn} clockedOut={clockedOut} />
      </div>
    </div>
  )
}

function AttendanceButton({ clockedIn, clockedOut }: { clockedIn: boolean; clockedOut: boolean }) {
  if (clockedOut) return <div className="text-3xl">✅</div>
  return (
    <form action={clockedIn ? '/api/attendance' : '/api/attendance'} method="POST">
      <a href="/attendance" className="bg-white text-indigo-700 px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-50 transition-all">
        {clockedIn ? '→ Clock Out' : '→ Clock In'}
      </a>
    </form>
  )
}

function formatTime(iso?: string) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
