import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: []
  },
  async headers() {
    return [
      {
        source: "/api/media/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,POST" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, X-Requested-With, Accept" }
        ]
      }
    ];
  }
};

export default nextConfig;
