/// <reference types="node" />
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
const script = readFileSync("public/sw.js", "utf8");
function worker(enabled = true) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue([]);
  vm.runInNewContext(script, {
    URL,
    caches: {
      open: async () => ({
        match: async () =>
          enabled ? { json: async () => ({ userId: "u1" }) } : undefined,
      }),
    },
    self: {
      location: { origin: "https://nodouni.example" },
      registration: { showNotification },
      clients: { matchAll, openWindow, claim: vi.fn() },
      skipWaiting: vi.fn(),
      addEventListener: (type: string, listener: (event: unknown) => void) => {
        handlers[type] = listener;
      },
    },
  });
  async function dispatch(type: string, fields: Record<string, unknown>) {
    let pending: Promise<unknown> | undefined;
    handlers[type]({
      ...fields,
      waitUntil: (promise: Promise<unknown>) => {
        pending = promise;
      },
    });
    await pending;
  }
  return { showNotification, openWindow, matchAll, dispatch };
}
describe("Service Worker push", () => {
  it("muestra titulo y cuerpo del payload con su publicación", async () => {
    const sw = worker();
    await sw.dispatch("push", {
      data: {
        json: () => ({
          titulo: "Publicación",
          cuerpo: "Tu amigo publicó",
          url: "/posts/p1",
        }),
      },
    });
    expect(sw.showNotification).toHaveBeenCalledWith(
      "Publicación",
      expect.objectContaining({
        body: "Tu amigo publicó",
        data: { url: "https://nodouni.example/posts/p1", userId: "u1" },
      }),
    );
  });
  it("no muestra avisos después de desactivar", async () => {
    const sw = worker(false);
    await sw.dispatch("push", { data: { json: () => ({ titulo: "Aviso" }) } });
    expect(sw.showNotification).not.toHaveBeenCalled();
  });
  it("rechaza enlaces externos y abre una ventana cuando no hay una", async () => {
    const sw = worker();
    await sw.dispatch("notificationclick", {
      notification: {
        close: vi.fn(),
        data: { userId: "u1", url: "https://otro.example/posts/p1" },
      },
    });
    expect(sw.openWindow).toHaveBeenCalledWith("https://nodouni.example/feed");
  });
  it("navega y enfoca una pestaña existente sin abrir otra", async () => {
    const sw = worker();
    const client = {
      url: "https://nodouni.example/perfil",
      navigate: vi.fn(),
      focus: vi.fn(),
    };
    client.navigate.mockResolvedValue(client);
    sw.matchAll.mockResolvedValue([client]);
    await sw.dispatch("notificationclick", {
      notification: {
        close: vi.fn(),
        data: { userId: "u1", url: "/posts/p1" },
      },
    });
    expect(client.navigate).toHaveBeenCalledWith(
      "https://nodouni.example/posts/p1",
    );
    expect(client.focus).toHaveBeenCalled();
    expect(sw.openWindow).not.toHaveBeenCalled();
  });
  it("ignora notificaciones de una cuenta anterior", async () => {
    const sw = worker();
    await sw.dispatch("notificationclick", {
      notification: {
        close: vi.fn(),
        data: { userId: "other", url: "/posts/p1" },
      },
    });
    expect(sw.openWindow).not.toHaveBeenCalled();
    expect(sw.matchAll).not.toHaveBeenCalled();
  });
});
