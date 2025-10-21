import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    MAX_ALBUMS: process.env.MAX_ALBUMS || '10',
  },
  experimental: {
    // 启用 turbopack 用于生产构建（可选）
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
