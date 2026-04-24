import { defineConfig } from "vitest/config";

// Default to node for our pure JS tests (math, db, utils). Component tests
// opt into jsdom per-file via the `// @vitest-environment jsdom` pragma.
// Setup file installs the @testing-library/jest-dom matchers (toBeInTheDocument
// etc.) but only takes effect when jsdom is active.
export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["./src/test-setup.js"],
  },
});
