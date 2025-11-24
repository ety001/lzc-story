import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    MAX_ALBUMS: process.env.MAX_ALBUMS || '10',
    ADMIN_ALBUMS_PER_PAGE: process.env.ADMIN_ALBUMS_PER_PAGE || '10',
    NEXT_PUBLIC_ADMIN_ALBUMS_PER_PAGE: process.env.ADMIN_ALBUMS_PER_PAGE || '10',
  },
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;
