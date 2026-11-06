import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  envDir: "../..",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
  },
});
