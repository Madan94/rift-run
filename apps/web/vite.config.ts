import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  envDir: "../..",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes("commonjsHelpers")) return "runtime";
          if (id.includes("/node_modules/phaser/")) return "phaser";
        },
      },
    },
  },
});
