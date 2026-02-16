// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "@svgr/rollup";
import path from "path";

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
      app: path.resolve(__dirname, "app"),
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
