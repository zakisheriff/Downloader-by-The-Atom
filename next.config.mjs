import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: ".next-fetch",
  images: {
    remotePatterns: []
  },
  outputFileTracingRoot: path.join(process.cwd())
};

export default nextConfig;
