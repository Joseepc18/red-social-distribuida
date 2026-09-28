import { useRef, useState } from "react";
import { social } from "../services/social";
import { users } from "../services/users";
import { useRemote } from "./useRemote";
import { errorMessage } from "../lib/api";
import { socialCopy } from "../content/social-copy";
import type { Suggestion } from "../types/social";
export function useSuggestions(onFollow: () => void) {
  const remote = useRemote("suggestions", social.suggestions);
  const pending = useRef(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function follow(user: Suggestion) {
    if (pending.current) return;
    pending.current = true;
    setBusyId(user.id);
    setError("");
    setNotice("");
    try {
      await users.follow(user.id, false);
      setNotice(socialCopy.followed + " " + user.nombre + ".");
      remote.reload();
      onFollow();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      pending.current = false;
      setBusyId(null);
    }
  }
  return { ...remote, follow, busyId, mutationError: error, notice };
}
