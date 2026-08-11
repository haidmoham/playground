import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "app/static",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5003",
    },
  },
  build: {
    outDir: "dist",
  },
});
