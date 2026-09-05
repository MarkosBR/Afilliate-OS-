import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [".monkeycode-ai.live"],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: [".monkeycode-ai.live"],
  },
});
