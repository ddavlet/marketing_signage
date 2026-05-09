import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    host: true,        // bind 0.0.0.0 so Docker can expose it
    port: 5173,
    hmr: {
      // When running behind Traefik, HMR WebSocket must go through port 80
      host: process.env.HMR_HOST ?? "localhost",
      port: process.env.HMR_PORT ? parseInt(process.env.HMR_PORT) : 5173,
    },
    proxy: {
      // For non-Docker local dev: forward API/asset calls to Django.
      // /media/uploads serves actual files; /media (no suffix) is a React route.
      "/api": "http://localhost:8000",
      "/media/uploads": "http://localhost:8000",
      "/player": "http://localhost:8000",
      "/admin": "http://localhost:8000",
      "/static": "http://localhost:8000",
    },
  },
});
