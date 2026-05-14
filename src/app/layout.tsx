import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WorkForce Pro — Enterprise Attendance Management',
  description: 'Real-time attendance tracking, leave management, analytics and team collaboration in one unified platform.',
  keywords: ['attendance', 'workforce', 'hr', 'time tracking', 'leave management', 'payroll'],
  authors: [{ name: 'WorkForce Pro' }],
  openGraph: {
    title: 'WorkForce Pro',
    description: 'Enterprise Attendance Management System',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
