import path from "node:path";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(path.resolve(process.cwd(), "../.."));
export default {
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  serverExternalPackages: ["@modelcontextprotocol/client"],
  poweredByHeader: false,
};
