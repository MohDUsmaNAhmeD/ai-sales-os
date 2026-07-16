/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ai-sales-os/shared", "@ai-sales-os/db"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Speed up dev compilation
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Faster builds
  reactStrictMode: false,
  // Optimize webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
