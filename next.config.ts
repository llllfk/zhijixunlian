import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),  // Uncomment and add 'import path from "path"' if needed
  /* config options here */
  serverExternalPackages: ['coze-coding-dev-sdk'],
  transpilePackages: ['@coze/api'],
  webpack: (config, { dev }) => {
    // 扣子构建环境解析不了 package exports 子路径 @coze/api/ws-tools
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@coze/api/ws-tools': path.resolve(
        __dirname,
        'node_modules/@coze/api/dist/esm/ws-tools/index.mjs',
      ),
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      ws: false,
      os: false,
      crypto: false,
      fs: false,
      net: false,
      tls: false,
      jsonwebtoken: false,
      'node-fetch': false,
    };
    if (dev && config.cache && config.cache.type === 'filesystem') {
      config.cache.cacheDirectory = path.resolve(
        'node_modules/.cache/next-webpack',
      );
    }
    return config;
  },
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
