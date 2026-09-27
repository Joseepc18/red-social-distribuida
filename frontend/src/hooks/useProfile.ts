import { useCallback, useRef, useState, type SubmitEvent } from "react";
import { useSearchParams } from "react-router";
import { users } from "../services/users";
import { useAuth } from "./useAuth";
import { useRemote } from "./useRemote";
import { errorMessage } from "../lib/api";
import { profileCopy } from "../content/copy";

export function useProfile(id: string) {
  const { session, updateUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [profile, followers, following] = await Promise.all([
        users.profile(id, signal),
        users.followers(id, signal),
        users.following(id, signal),
      ]);
      return { profile, followers, following };
    },
    [id],
  );
  const remote = useRemote(id, load);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const own = session?.user.id === id;
  const following =
    remote.data?.followers.some((user) => user.id === session?.user.id) ??
    false;
  const list = params.get("lista") === "seguidos" ? "following" : "followers";
  function selectList(next: "followers" | "following") {
    setParams(
      { lista: next === "following" ? "seguidos" : "seguidores" },
      { replace: true },
    );
  }
  async function toggleFollow() {
    if (pending.current || !remote.data || own) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await users.follow(id, following);
      remote.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const nombre = String(form.get("nombre") ?? "").trim();
    if (!nombre) {
      setError(profileCopy.required);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const profile = await users.update({
        nombre,
        bio: String(form.get("bio") ?? "").trim(),
      });
      updateUser(profile);
      setEditing(false);
      setNotice(profileCopy.saved);
      remote.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return {
    ...remote,
    own,
    following,
    list,
    selectList,
    editing,
    startEditing: () => {
      setError("");
      setNotice("");
      setEditing(true);
    },
    cancelEditing: () => {
      setError("");
      setEditing(false);
    },
    busy,
    mutationError: error,
    notice,
    toggleFollow,
    save,
  };
}
