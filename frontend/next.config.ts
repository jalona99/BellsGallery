import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow Cloudflare Tunnel URL and local Wi-Fi LAN to load dev scripts on mobile
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "192.168.0.109",
    "192.168.0.109:3000",
    "192.168.56.1",
    "192.168.56.1:3000",
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*"
  ],
  async redirects() {
    return [
      {
        source: "/lokasi",
        destination: "/info/lokasi-toko",
        permanent: false,
      },
      {
        source: "/lokasi-toko",
        destination: "/info/lokasi-toko",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3001/api/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  turbopack: {},
};

export default nextConfig;
