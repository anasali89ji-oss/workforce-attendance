import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  // serverComponentsExternalPackages was renamed in Next.js 15+
  serverExternalPackages: ['@supabase/supabase-js', 'bcryptjs'],
}

export default nextConfig
