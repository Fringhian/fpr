import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineProject } from "vitest/config";

export default defineProject({
  resolve: { conditions: ["@fpr/source", ...defaultClientConditions] },
  ssr: { resolve: { conditions: ["@fpr/source", ...defaultServerConditions] } },
});
