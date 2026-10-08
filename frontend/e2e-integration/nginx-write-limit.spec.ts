import { expect, test } from "@playwright/test";

test("Nginx limita escrituras de API sin limitar GET ni consumir la cuota de auth", async ({
  request,
}) => {
  const statuses: number[] = [];
  for (let i = 0; i < 220; i++) {
    // The backend rejects this invalid request; the proxy must still count it.
    const response = await request.post("/api/posts", { data: {} });
    statuses.push(response.status());
  }
  expect(statuses.some((status) => status === 401 || status === 415)).toBe(
    true,
  );
  expect(statuses).toContain(429);

  for (let i = 0; i < 30; i++) {
    expect((await request.get("/api/info")).status()).toBe(200);
  }
  const login = await request.post("/api/auth/login", {
    data: { username: "ana", password: "Demo2026!" },
  });
  expect(login.status()).toBe(200);
});
