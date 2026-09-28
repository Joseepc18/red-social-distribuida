import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const origins = [
  { name: "local", url: "http://localhost:8080", protocol: "ws:" },
  { name: "túnel HTTPS", url: process.env.CHAT_TUNNEL_URL!, protocol: "wss:" },
];

function compose(...args: string[]) {
  return execFileSync("docker", ["compose", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function connections(since: string) {
  const logs = compose(
    "logs",
    "--no-color",
    "--timestamps",
    "--since",
    since,
    "backend-1",
    "backend-2",
  );
  const latest = new Map<string, { instance: string; line: string }>();
  const lines = logs.split("\n").sort((a, b) => {
    const stamp = (line: string) =>
      line.match(/\d{4}-\d{2}-\d{2}T\S+/)?.[0] ?? "";
    return stamp(a).localeCompare(stamp(b));
  });
  for (const line of lines) {
    const match = line.match(
      /\[(backend-[12])\].*Chat connected user=([\w-]+) connection=/,
    );
    if (match) latest.set(match[2], { instance: match[1], line });
  }
  return latest;
}

async function connected(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: /^Conectado$/ }),
  ).toBeVisible();
}

async function send(page: Page, text: string) {
  await page.getByRole("textbox", { name: /^Escribe un mensaje/ }).fill(text);
  await page
    .getByRole("button", { name: "Enviar mensaje", exact: true })
    .click();
  await expect(page.getByText(text, { exact: true })).toHaveCount(1);
}

for (const origin of origins) {
  test(`tolerancia del chat: ${origin.name}`, async ({ browser }, testInfo) => {
    const since = new Date().toISOString();
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const contexts = await Promise.all([
      browser.newContext({ baseURL: origin.url }),
      browser.newContext({ baseURL: origin.url }),
    ]);
    const pages = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    const users: { id: string; username: string }[] = [];
    const evidence: string[] = [
      `Origen: ${origin.name} (${origin.protocol}//)`,
    ];
    const sockets: string[][] = [[], []];
    let conversationId: string | undefined;
    try {
      compose("start", "backend-1");
      for (let i = 0; i < 2; i++) {
        const username = `qa51_${i}_${suffix}`;
        const password = randomUUID();
        const registration = await contexts[i].request.post(
          "/api/auth/registro",
          {
            data: {
              username,
              password,
              email: `${username}@example.test`,
              nombre: username,
            },
          },
        );
        expect(registration.status()).toBe(201);
        const profile = await registration.json();
        users.push({ id: profile.id, username });
        pages[i].on("websocket", (socket) => {
          // Record the protocol only, never the query containing the JWT.
          sockets[i].push(new URL(socket.url()).protocol);
        });
        await pages[i].goto("/login");
        await pages[i].getByLabel("Nombre de usuario").fill(username);
        await pages[i].getByLabel("Contraseña").fill(password);
        await pages[i]
          .getByRole("button", { name: "Iniciar sesión", exact: true })
          .click();
        await expect(pages[i]).not.toHaveURL(/\/login$/);
      }
      const session = await pages[0].evaluate(() =>
        JSON.parse(localStorage.getItem("nodouni.session")!),
      );
      const response = await contexts[0].request.post("/api/conversaciones", {
        headers: { Authorization: `Bearer ${session.token}` },
        data: { usuarioId: users[1].id },
      });
      expect(response.status()).toBe(200);
      conversationId = (await response.json()).id;
      for (const page of pages) {
        await page.goto(`/chat?conversacion=${conversationId}`);
        await connected(page);
      }
      // REST traffic also uses round robin. Verify real socket placement in logs
      // instead of assuming alternating /api/info responses imply split sockets.
      for (let attempt = 0; attempt < 12; attempt++) {
        const placement = connections(since);
        if (
          placement.get(users[0].id)?.instance !==
          placement.get(users[1].id)?.instance
        )
          break;
        if (attempt % 2 === 0) await contexts[1].request.get("/api/info");
        await pages[1].reload();
        await connected(pages[1]);
      }
      const placement = connections(since);
      const first = placement.get(users[0].id);
      const second = placement.get(users[1].id);
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first!.instance).not.toBe(second!.instance);
      evidence.push(first!.line, second!.line);
      console.log(
        `${origin.name}: sockets en ${first!.instance} y ${second!.instance}`,
      );
      expect(
        sockets.every(
          (seen) => seen.length > 0 && seen.every((p) => p === origin.protocol),
        ),
      ).toBe(true);

      await send(pages[0], `Ida ${suffix}`);
      await expect(
        pages[1].getByText(`Ida ${suffix}`, { exact: true }),
      ).toHaveCount(1);
      await send(pages[1], `Vuelta ${suffix}`);
      await expect(
        pages[0].getByText(`Vuelta ${suffix}`, { exact: true }),
      ).toHaveCount(1);
      evidence.push("Entrega bidireccional entre instancias: OK");
      console.log(`${origin.name}: entrega bidireccional comprobada`);

      const receiverIndex = first!.instance === "backend-1" ? 0 : 1;
      const receiver = pages[receiverIndex];
      const sender = pages[1 - receiverIndex];
      // Pause only the receiver's retry timer to make the disconnected interval
      // deterministic; WebSocket close events and the real backend remain active.
      await receiver.clock.install();
      await receiver.clock.pauseAt(new Date());
      compose("stop", "backend-1");
      console.log(`${origin.name}: backend-1 detenido`);
      await expect(
        receiver.getByRole("status").filter({ hasText: "Reconectando" }),
      ).toBeVisible();
      await connected(sender);
      const missed = `Durante desconexión ${suffix}`;
      await send(sender, missed);
      await expect(receiver.getByText(missed, { exact: true })).toHaveCount(0);
      const historyLoaded = receiver.waitForResponse(
        (r) =>
          r.url().includes(`/api/conversaciones/${conversationId}/mensajes`) &&
          r.status() === 200,
      );
      await receiver.clock.resume();
      const [, historyResponse] = await Promise.all([
        connected(receiver),
        historyLoaded,
      ]);
      const recovered = await historyResponse.json();
      expect(
        recovered.mensajes.some(
          (message: { texto: string }) => message.texto === missed,
        ),
      ).toBe(true);
      await expect(receiver.getByText(missed, { exact: true })).toHaveCount(1);
      expect(connections(since).get(users[receiverIndex].id)?.instance).toBe(
        "backend-2",
      );
      evidence.push(
        "Caída backend-1, reconexión automática a backend-2 e historial REST: OK",
      );
      await send(receiver, `Tras reconectar ${suffix}`);
      await expect(
        sender.getByText(`Tras reconectar ${suffix}`, { exact: true }),
      ).toHaveCount(1);
      await receiver.reload();
      await connected(receiver);
      await expect(receiver.getByText(missed, { exact: true })).toHaveCount(1);
      evidence.push(
        "Mensaje durante desconexión persistido y visible tras recargar, sin duplicados: OK",
      );

      compose("start", "backend-1");
      await expect
        .poll(
          async () => {
            const response = await contexts[0].request.get("/api/info");
            return response.ok() ? (await response.json()).instancia : "";
          },
          { timeout: 60_000, intervals: [1_000, 2_000] },
        )
        .toBe("backend-1");
      const restored = new Set<string>();
      for (let i = 0; i < 12; i++) {
        const response = await contexts[0].request.get("/api/info");
        expect(response.ok()).toBe(true);
        restored.add((await response.json()).instancia);
      }
      expect([...restored].sort()).toEqual(["backend-1", "backend-2"]);
      for (let i = 0; i < 12; i++) {
        await receiver.reload();
        await connected(receiver);
        if (
          connections(since).get(users[receiverIndex].id)?.instance ===
          "backend-1"
        )
          break;
        await contexts[receiverIndex].request.get("/api/info");
      }
      expect(connections(since).get(users[receiverIndex].id)?.instance).toBe(
        "backend-1",
      );
      evidence.push(connections(since).get(users[receiverIndex].id)!.line);
      await send(receiver, `Instancia reincorporada ${suffix}`);
      await expect(
        sender.getByText(`Instancia reincorporada ${suffix}`, { exact: true }),
      ).toHaveCount(1);
      evidence.push("backend-1 reincorporado al balanceo REST y WebSocket: OK");
    } finally {
      // Restore the service even if an assertion fails; do not leave the stack degraded.
      try {
        compose("start", "backend-1");
      } finally {
        await Promise.all(contexts.map((context) => context.close()));
        // Generated ids only, no credentials in the command or evidence.
        const ids = users.map((user) => user.id);
        if (
          ids.length &&
          ids.every((id) => /^[0-9a-f-]{36}$/.test(id)) &&
          (!conversationId || /^[0-9a-f-]{36}$/.test(conversationId))
        ) {
          const query =
            `MATCH (u:Usuario) WHERE u.id IN [${ids.map((id) => `'${id}'`).join(",")}] ` +
            "OPTIONAL MATCH (u)-[:ENVIA]->(m:Mensaje) WITH collect(DISTINCT u) AS us, collect(DISTINCT m) AS ms " +
            "FOREACH (m IN ms | DETACH DELETE m) FOREACH (u IN us | DETACH DELETE u)" +
            (conversationId
              ? ` WITH 1 AS x MATCH (c:Conversacion {id:'${conversationId}'}) DETACH DELETE c`
              : "");
          compose(
            "exec",
            "-T",
            "neo4j",
            "sh",
            "-c",
            'exec cypher-shell -u neo4j -p "${NEO4J_AUTH#*/}" "$1"',
            "sh",
            query,
          );
        }
        const evidencePath = testInfo.outputPath("evidencia-sin-tokens.txt");
        await writeFile(evidencePath, evidence.join("\n"), "utf8");
        await testInfo.attach("evidencia-sin-tokens", {
          path: evidencePath,
          contentType: "text/plain",
        });
        console.log(evidence.join("\n"));
      }
    }
  });
}
