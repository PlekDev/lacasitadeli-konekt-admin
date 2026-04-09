/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
       destination: 'https://lacasita-api-production.up.railway.app/api/:path*',
      },
    ];
  },
}
module.exports = nextConfig
