import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '143.198.88.163' },
      { protocol: 'http', hostname: '157.245.153.76' },
      { protocol: 'https', hostname: '*.pakhub.com' },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true,
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', '143.198.88.163:3000'] },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
