import { defineConfig, devices } from "@playwright/test";

// Separate from CI/integration: this demonstration deliberately stops a backend.
if (process.env.CHAT_FAILOVER !== "1")
  throw new Error("Confirma la prueba con CHAT_FAILOVER=1; detiene backend-1.");
const remote = process.env.CHAT_TUNNEL_URL;
if (!remote || new URL(remote).protocol !== "https:")
  throw new Error(
    "CHAT_TUNNEL_URL debe contener la URL HTTPS actual del túnel.",
  );

export default defineConfig({
  testDir: "./e2e-failover",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    actionTimeout: 15_000,
    ...devices["Desktop Chrome"],
    // Traces/network recordings would retain JWTs in the WebSocket query.
    trace: "off",
    screenshot: "off",
    launchOptions: {
      executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    },
  },
});
