import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    MAX_ALBUMS: process.env.MAX_ALBUMS || '10',
  },
  // 禁用 turbopack 以避免与 better-sqlite3 的兼容性问题
  // experimental: {
  //   turbo: {
  //     rules: {
  //       '*.svg': {
  //         loaders: ['@svgr/webpack'],
  //         as: '*.js',
  //       },
  //     },
  //   },
  // },
};

export default nextConfig;
