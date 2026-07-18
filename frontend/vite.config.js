import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/state": "http://127.0.0.1:8000",
      "/run": "http://127.0.0.1:8000",
      "/reset": "http://127.0.0.1:8000",
      "/lake": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000"
    }
  }
});
