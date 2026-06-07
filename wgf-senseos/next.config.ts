import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@uwsc/core",
    "@uwsc/edge-protocol",
    "@uwsc/privacy-core"
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@uwsc/core": path.resolve(__dirname, "../packages/uwsc-core/src"),
      "@uwsc/edge-protocol": path.resolve(__dirname, "../packages/uwsc-edge-protocol/src"),
      "@uwsc/privacy-core": path.resolve(__dirname, "../packages/uwsc-privacy-core/src"),
    };
    return config;
  }
};

export default nextConfig;
