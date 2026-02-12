import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  base:
    process.env.NODE_ENV === "production" ? "/leslie-benjamin-wedding/" : "/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  preview: {
    port: 4173,
  },
});
