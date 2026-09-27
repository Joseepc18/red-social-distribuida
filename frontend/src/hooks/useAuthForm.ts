import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "./useAuth";
import { users } from "../services/users";
import { errorMessage } from "../lib/api";
import { tokenExpiresAt } from "../lib/session";
import { authCopy } from "../data/mockData";

export function useAuthForm(mode: "login" | "register") {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const state = location.state as {
    from?: string;
    registered?: boolean;
    username?: string;
  } | null;
  const registered = state?.registered === true;
  const username = typeof state?.username === "string" ? state.username : "";
  const destination =
    typeof state?.from === "string" &&
    state.from.startsWith("/") &&
    !state.from.startsWith("//") &&
    !/^\/(login|registro)(\/|\?|$)/.test(state.from)
      ? state.from
      : "/feed";
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    const credentials = {
      username: String(data.get("username") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    };
    const nombre = String(data.get("nombre") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (
      !credentials.username ||
      !credentials.password.trim() ||
      (mode === "register" && !nombre)
    ) {
      setError(authCopy.required);
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        await users.register(
          { ...credentials, nombre, email },
          controller.signal,
        );
        navigate("/login", {
          replace: true,
          state: {
            registered: true,
            username: credentials.username,
            from: destination,
          },
        });
      } else {
        const { token } = await users.login(credentials, controller.signal);
        if (typeof token !== "string" || tokenExpiresAt(token) <= Date.now())
          throw new Error("Invalid token");
        const user = await users.me(controller.signal, token);
        if (controller.signal.aborted) return;
        startSession(token, user);
        navigate(destination, { replace: true });
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      pending.current = null;
    }
  }
  return { submit, busy, error, registered, username, destination };
}
