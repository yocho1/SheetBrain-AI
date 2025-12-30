const path = require('path');
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  // Silence monorepo lockfile warning; set root to repo root
  outputFileTracingRoot: path.join(__dirname, '..'),
  // Moved from experimental.serverComponentsExternalPackages
  serverExternalPackages: ['stripe'],
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
  redirects: async () => [
    {
      source: '/docs',
      destination: 'https://docs.sheetbrain.ai',
      permanent: false,
    },
  ],
};

module.exports = nextConfig;
