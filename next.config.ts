import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
  experimental: {},
  async headers() {
    // Fix 6.1: Never fall back to wildcard '*' — restrict to explicit APP_URL only
    const origin = process.env.NEXT_PUBLIC_APP_URL
    if (!origin) {
      console.warn('[CORS] NEXT_PUBLIC_APP_URL not set — defaulting to http://localhost:3000')
    }
    const allowedOrigin = origin || 'http://localhost:3000'

    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-CSRF-Token' },
        ],
      },
    ]
  },
}

export default nextConfig
