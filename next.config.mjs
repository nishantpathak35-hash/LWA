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
};

export default nextConfig;
