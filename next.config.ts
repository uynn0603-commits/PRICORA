import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Zalo's crawler is not in Next's default list and only reads tags present in the initial
  // HTML, so metadata is never streamed in after the body.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
