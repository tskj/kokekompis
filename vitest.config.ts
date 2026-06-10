import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Next.js tvinger tsconfig `jsx: "preserve"` (skriver den tilbake ved build/lint), så JSX-
  // transformen for tester konfigureres her i stedet for i tsconfig.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    // Tests run against a real Postgres (see tests/db.ts). DB-backed lanes share one
    // test database and reset hooks, so they must not run in parallel.
    fileParallelism: false,
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      // `import "server-only"` throws outside a server bundle; shim it to a no-op under Vitest.
      "server-only": new URL("./tests/server-only-shim.ts", import.meta.url).pathname,
    },
  },
});
