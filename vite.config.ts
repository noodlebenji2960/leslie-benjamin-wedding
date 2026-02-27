import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "@svgr/rollup";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
  plugins: [
    // reactRouter plugin must be excluded during testing
    mode !== "test" && reactRouter(),
    tsconfigPaths(),
    svgr(),
  ].filter(Boolean),

  base: process.env.VITE_BASE ?? "/",

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
        loadPaths: [resolve(__dirname)],
      },
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./app/test/setup.ts",
    include: ["app/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
  },
}));
