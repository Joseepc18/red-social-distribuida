import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.BACKEND_PROXY_TARGET || "http://localhost:8080";
  const media = env.MEDIA_PROXY_TARGET || "http://localhost:9000";
  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      proxy: {
        "/api": { target: backend, changeOrigin: true },
        "/ws": { target: backend, changeOrigin: true, ws: true },
        "/media": { target: media, changeOrigin: true },
      },
    },
  };
});
