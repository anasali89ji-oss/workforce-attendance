import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'WorkForce — Attendance Management',
  description: 'Enterprise workforce attendance management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
