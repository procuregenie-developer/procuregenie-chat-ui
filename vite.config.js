// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // NEW SECTION: Forcing Vite to handle dependencies carefully
  optimizeDeps: {
    // Explicitly exclude these from being pre-bundled to avoid conflicts
    exclude: ["react", "react-dom", "@radix-ui/react-tabs"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
    conditions: ["browser", "import", "module"],
  }
});