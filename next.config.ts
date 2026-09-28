import type { NextConfig } from "next";
const config: NextConfig = {
  basePath: "/health",
  poweredByHeader: false,
  devIndicators: false,
  distDir: process.env.BIBLIOTECH_E2E === "1" ? ".next-e2e" : ".next",
  turbopack: { root: process.cwd() },
};
export default config;
