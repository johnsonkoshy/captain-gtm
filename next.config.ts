import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-mode badge so screen recordings from `npm run dev` stay clean.
  devIndicators: false,
};

export default nextConfig;
