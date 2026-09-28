import path from "node:path";
import { createRequire } from "node:module";
const loadDependency = createRequire(path.join(process.cwd(), "next.config.ts"));
const nextEnv = loadDependency("@next/env") as typeof import("@next/env");
const cloudflare = process.env.BIBLIOTECH_CLOUDFLARE === "1";
if (!cloudflare) nextEnv.loadEnvConfig(path.resolve(process.cwd(), "../.."));
export default {
  ...(process.env.BIBLIOTECH_STANDALONE === "1"
    ? { output: "standalone" as const }
    : {}),
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  outputFileTracingExcludes: {
    "/*": ["../../.env*", "../../.data/**/*"],
  },
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  serverExternalPackages: cloudflare ? [] : ["@modelcontextprotocol/client"],
  poweredByHeader: false,
};
