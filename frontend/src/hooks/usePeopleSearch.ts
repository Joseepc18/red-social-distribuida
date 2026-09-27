import { useCallback, type SubmitEvent } from "react";
import { useSearchParams } from "react-router";
import { useRemote } from "./useRemote";
import { users } from "../services/users";
export function usePeopleSearch() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const load = useCallback(
    (signal: AbortSignal) => users.search(query, signal),
    [query],
  );
  const remote = useRemote(query, load);
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = String(form.get("q") ?? "").trim();
    if (next === query) remote.reload();
    else setParams(next ? { q: next } : {});
  }
  return { ...remote, query, submit };
}
