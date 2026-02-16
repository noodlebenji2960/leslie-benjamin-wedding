// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "@svgr/rollup";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths(), svgr()],

  base: process.env.VITE_BASE ? process.env.VITE_BASE : "/",

  build: {
    outDir: "dist",
    sourcemap: false,
  },

  preview: {
    port: 4173,
  },
  resolve: {
    alias: {
      app: resolve(__dirname, "app"),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "app/styles/variables" as *;
          @use "app/styles/mixins" as *;
        `,
      },
    },
  },
});
