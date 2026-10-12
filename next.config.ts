import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    // the cinematic landing is a single self-contained HTML file
    return { beforeFiles: [{ source: '/', destination: '/landing.html' }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
