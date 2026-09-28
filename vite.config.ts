import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  envDir: false,
  plugins: [
    vinext(),
    cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } }),
  ],
});
