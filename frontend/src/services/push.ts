import { api, ApiError, errorMessage } from "../lib/api";
import { getSession } from "../lib/session";
import { pushCopy } from "../content/push-copy";

// This metadata is shared with /sw.js; no JWT or API response is cached.
const CACHE = "nodouni-push-v1";
const STATE = "/__nodouni_push_state__";
interface PushOwner {
  readonly userId: string;
  readonly endpoint: string;
}
export function pushSupported() {
  return (
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    "caches" in window
  );
}
async function owner(): Promise<PushOwner | null> {
  const response = await (await caches.open(CACHE)).match(STATE);
  return response ? response.json() : null;
}
async function locked<T>(action: () => Promise<T>): Promise<T> {
  return navigator.locks
    ? navigator.locks.request("nodouni-push", action)
    : action();
}
function assertSession(userId: string, token: string) {
  const active = getSession();
  if (active?.user.id !== userId || active.token !== token)
    throw new Error(pushCopy.changedSession);
}
async function registration() {
  await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  return navigator.serviceWorker.ready;
}
async function clearLocal(reg: ServiceWorkerRegistration) {
  await (await caches.open(CACHE)).delete(STATE);
  for (const notification of await reg.getNotifications()) notification.close();
  const subscription = await reg.pushManager.getSubscription();
  if (
    subscription &&
    !(await subscription.unsubscribe()) &&
    (await reg.pushManager.getSubscription())
  )
    throw new Error(pushCopy.browserError);
}
function subscriptionBody(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error(pushCopy.browserError);
  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  };
}
export async function inspectPush(
  userId: string,
  token: string,
): Promise<boolean> {
  if (!pushSupported()) return false;
  return locked(async () => {
    assertSession(userId, token);
    const reg = await registration();
    const saved = await owner();
    const subscription = await reg.pushManager.getSubscription();
    if (
      !saved ||
      saved.userId !== userId ||
      Notification.permission !== "granted" ||
      saved.endpoint !== subscription?.endpoint
    ) {
      if (saved || subscription) await clearLocal(reg);
      return false;
    }
    assertSession(userId, token);
    await api<void>("/push/suscripciones", {
      method: "POST",
      token,
      body: JSON.stringify(subscriptionBody(subscription)),
    });
    return true;
  });
}
function decodeKey(value: string) {
  const decoded = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4)
    throw new Error(pushCopy.browserError);
  return bytes;
}
export async function enablePush(userId: string, token: string) {
  return locked(async () => {
    assertSession(userId, token);
    const reg = await registration();
    const { clavePublica } = await api<{ clavePublica: string }>(
      "/push/clave-publica",
      { auth: false },
    );
    const key = decodeKey(clavePublica);
    let subscription = await reg.pushManager.getSubscription();
    const saved = await owner();
    const previousKey = subscription?.options.applicationServerKey;
    if (
      subscription &&
      (saved?.userId !== userId ||
        !previousKey ||
        new Uint8Array(previousKey).length !== key.length ||
        new Uint8Array(previousKey).some(
          (value, index) => value !== key[index],
        ))
    ) {
      await clearLocal(reg);
      subscription = null;
    }
    assertSession(userId, token);
    const created = !subscription;
    subscription ??= await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
    try {
      assertSession(userId, token);
      await api<void>("/push/suscripciones", {
        method: "POST",
        token,
        body: JSON.stringify(subscriptionBody(subscription)),
      });
      assertSession(userId, token);
      const savedOwner: PushOwner = { userId, endpoint: subscription.endpoint };
      await (
        await caches.open(CACHE)
      ).put(
        STATE,
        new Response(JSON.stringify(savedOwner), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    } catch (error) {
      if (created) await clearLocal(reg);
      throw error;
    }
  });
}
export async function disablePush(userId: string, token: string) {
  if (!pushSupported()) return;
  return locked(async () => {
    const saved = await owner();
    if (saved && saved.userId !== userId) return;
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) return;
    const subscription = await reg.pushManager.getSubscription();
    const endpoint = saved?.endpoint ?? subscription?.endpoint;
    const results = await Promise.allSettled([
      clearLocal(reg),
      endpoint
        ? api<void>("/push/suscripciones", {
            method: "DELETE",
            token,
            body: JSON.stringify({ endpoint }),
          })
        : Promise.resolve(),
    ]);
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  });
}
export function pushError(error: unknown) {
  if (error instanceof ApiError) return errorMessage(error);
  if (Notification.permission === "denied") return pushCopy.denied;
  if (error instanceof Error && error.message === pushCopy.changedSession)
    return error.message;
  return pushCopy.browserError;
}
