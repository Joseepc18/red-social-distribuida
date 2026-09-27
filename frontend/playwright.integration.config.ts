import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const externalUrl = process.env.INTEGRATION_BASE_URL;

export default defineConfig({
  ...base,
  testDir: "./e2e-integration",
  use: {
    ...base.use,
    baseURL: externalUrl || "http://127.0.0.1:5173",
  },
  webServer: externalUrl ? undefined : base.webServer,
});
