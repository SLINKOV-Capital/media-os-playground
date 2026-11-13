import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:3017", browserName: "chromium", serviceWorkers: "block", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3017",
    url: "http://127.0.0.1:3017",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      OAUTH_E2E: "1",
      MCP_OAUTH_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      NEXT_PUBLIC_SUPABASE_URL: "https://oauth-e2e.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "oauth-e2e-publishable-key",
    },
  },
});
