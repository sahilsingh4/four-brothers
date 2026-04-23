import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",  // our tests are pure JS, no DOM needed for math + db
    include: ["src/**/*.test.{js,jsx}"],
  },
});
