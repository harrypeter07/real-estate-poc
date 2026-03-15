/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-image-domain.com',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
