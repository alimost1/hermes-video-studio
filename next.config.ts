import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["bullmq", "ioredis"],
  poweredByHeader: false,
};
export default config;
