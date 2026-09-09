/** @type {import('next').NextConfig} */
const backendUrl = process.env.API_URL || 'http://localhost:8000/api';

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/:path*` },
    ];
  },
};

module.exports = nextConfig;
