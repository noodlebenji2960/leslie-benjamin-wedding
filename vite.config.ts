import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  // Allow overriding the production base via VITE_BASE env var.
  // For GitHub Pages with a custom domain you should set the base to '/'.
  base: process.env.VITE_BASE
    ? process.env.VITE_BASE
    : "/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  preview: {
    port: 4173,
  },
});
