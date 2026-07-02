import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/cvbuilder/",
  server: {
    port: 5174,
    proxy: {
      "/cvbuilder/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cvbuilder/, ""),
      },
    },
  },
});
