import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    // tests share one database; run files one at a time
    fileParallelism: false,
    env: {
      ENFORCE_QUOTAS: "1",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://chainmatch:chainmatch@localhost:5433/chainmatch_test",
    },
  },
});
