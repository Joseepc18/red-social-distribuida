import { useEffect, useRef, useState } from "react";
import {
  disablePush,
  enablePush,
  inspectPush,
  pushError,
  pushSupported,
} from "../services/push";
import { pushCopy } from "../content/push-copy";
export function usePushNotifications(userId: string, token: string) {
  const supported = pushSupported();
  const [ready, setReady] = useState(!supported);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const [permission, setPermission] = useState(
    supported ? Notification.permission : "denied",
  );
  useEffect(() => {
    if (!supported) return;
    let active = true;
    async function refresh() {
      if (pending.current) return;
      try {
        const result = await inspectPush(userId, token);
        if (active && !pending.current) {
          setEnabled(result);
          setError("");
        }
      } catch (cause) {
        if (active && !pending.current) setError(pushError(cause));
      } finally {
        if (active) {
          setReady(true);
          setPermission(Notification.permission);
        }
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [supported, userId, token]);
  async function toggle() {
    if (pending.current || !supported) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      if (enabled) {
        await disablePush(userId, token);
        setEnabled(false);
      } else {
        // Request only in this explicit button handler.
        const granted = await Notification.requestPermission();
        setPermission(granted);
        if (granted !== "granted") {
          setError(granted === "denied" ? pushCopy.denied : pushCopy.dismissed);
          return;
        }
        await enablePush(userId, token);
        setEnabled(true);
      }
    } catch (cause) {
      setError(pushError(cause));
      // A partial failure may already have disabled the local subscription.
      try {
        setEnabled(await inspectPush(userId, token));
      } catch {
        /* Keep the actionable error. */
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { supported, ready, enabled, busy, error, permission, toggle };
}
