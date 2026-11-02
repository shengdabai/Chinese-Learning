import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Migrated from Create React App. REACT_APP_* variables keep their names (envPrefix),
// and the production build still goes to build/ for the Dockerfile and hosting settings.
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { port: 3000 },
  build: { outDir: "build" },
});
