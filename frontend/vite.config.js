import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || "/cvbuilder/";

  return {
    plugins: [react()],
    base,
    server: {
      port: 5174,
      proxy: {
        "/cvbuilder/api": {
          target: "http://127.0.0.1:8001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/cvbuilder/, ""),
        },
        "/api": {
          target: "http://127.0.0.1:8001",
          changeOrigin: true,
        },
      },
    },
  };
});
