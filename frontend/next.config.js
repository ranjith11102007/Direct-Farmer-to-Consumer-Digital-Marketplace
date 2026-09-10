/** @type {import('next').NextConfig} */
const backendUrl = process.env.API_URL;

if (!backendUrl) {
  console.warn('[next.config] API_URL not set; /api rewrites disabled. Use Vercel service routing.');
}

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    if (!backendUrl) return [];
    return [
      { source: '/api/:path*', destination: `${backendUrl}/:path*` },
    ];
  },
};

module.exports = nextConfig;
