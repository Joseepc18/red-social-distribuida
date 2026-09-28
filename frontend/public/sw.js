/* global self, caches */
const CACHE = "nodouni-push-v1";
const STATE = "/__nodouni_push_state__";
async function pushOwner() {
  const response = await (await caches.open(CACHE)).match(STATE);
  return response ? response.json() : null;
}
function destination(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (
      url.origin === self.location.origin &&
      /^\/posts\/[^/]+$/.test(url.pathname)
    )
      return url.origin + url.pathname;
  } catch {
    /* Invalid payloads use the application's landing page. */
  }
  return self.location.origin + "/feed";
}
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const owner = await pushOwner();
      if (!owner) return;
      let payload = {};
      try {
        payload = event.data?.json() ?? {};
      } catch {
        /* Show a safe fallback. */
      }
      const url = destination(payload.url);
      await self.registration.showNotification(
        typeof payload.titulo === "string"
          ? payload.titulo
          : "Nueva publicación en NodoUni",
        {
          body:
            typeof payload.cuerpo === "string"
              ? payload.cuerpo
              : "Hay novedades en tu comunidad.",
          tag: url,
          data: { url, userId: owner.userId },
        },
      );
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const owner = await pushOwner();
      if (!owner || owner.userId !== event.notification.data?.userId) return;
      const url = destination(event.notification.data?.url);
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const client =
        windows.find((item) => item.url === url) ??
        windows.find(
          (item) => new URL(item.url).origin === self.location.origin,
        );
      if (client) {
        const target = client.url === url ? client : await client.navigate(url);
        if (target) {
          await target.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
