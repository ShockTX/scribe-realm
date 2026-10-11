import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 2000 },
  server: {
    proxy: {
      "/gm": {
        target: process.env.GM_TARGET || "http://127.0.0.1:8710",
        changeOrigin: true,
      },
    },
  },
});
