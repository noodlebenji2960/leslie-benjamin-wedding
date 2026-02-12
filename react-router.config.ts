import type { Config } from "@react-router/dev/config";
import viteConfig from "vite.config";

export default {
  buildDirectory: "dist",
  ssr: false,
  prerender: true,
  basename: viteConfig.base,
} satisfies Config;
