import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defaultClientConditions, defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: { conditions: ["@fpr/source", ...defaultClientConditions] },
  server: {
    // Like `web` in production, the proxy sends the client's address in
    // X-Forwarded-For, which the API's rate limits are kept for.
    proxy: {
      "/api": { target: "http://localhost:3000", xfwd: true },
    },
  },
});
