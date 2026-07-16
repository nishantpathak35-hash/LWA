import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@libsql/client'],
  allowedDevOrigins: ['armor-subcommittee-interpreted-sees.trycloudflare.com'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:fs': false,
        'node:https': false,
        'node:http': false,
        'node:path': false,
        'node:stream': false,
        'node:zlib': false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        path: false,
        stream: false,
        zlib: false,
      };
    }
    return config;
  },
};

export default nextConfig;
