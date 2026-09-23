/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'tesseract.js'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
