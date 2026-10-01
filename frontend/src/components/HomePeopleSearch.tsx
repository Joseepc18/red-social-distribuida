import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { users } from "../services/users";
import { useRemote } from "../hooks/useRemote";
import { copy, homeCopy } from "../content/copy";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { StatusMessage } from "./StatusMessage";

interface HomePeopleSearchProps {
  readonly children?: never;
}

const SEARCH_DEBOUNCE_MS = 300;

export function HomePeopleSearch(_props: HomePeopleSearchProps) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  // Keep the previous results visible while typing; aria-busy reports the pending search.
  const showResults = Boolean(query) && Boolean(draft.trim());
  const load = useCallback(
    (signal: AbortSignal) =>
      query ? users.search(query, signal) : Promise.resolve([]),
    [query],
  );
  const state = useRemote("home-people-search:" + query, load);

  // Search while typing, once the user pauses; useRemote aborts any outdated request.
  useEffect(() => {
    const nextQuery = draft.trim();
    if (!nextQuery) return;
    const timer = window.setTimeout(
      () => setQuery(nextQuery),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [draft]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = draft.trim();
    if (nextQuery === query) {
      if (nextQuery) state.reload();
      return;
    }
    setQuery(nextQuery);
  }

  return (
    <div className="home-people-search" id="buscar-personas">
      <form role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="home-people-search-input">
          {copy.search}
        </label>
        <div className="home-search-field">
          <Icon name="search" />
          <input
            id="home-people-search-input"
            type="search"
            value={draft}
            aria-expanded={showResults}
            aria-controls={
              showResults ? "home-people-search-results" : undefined
            }
            onChange={(event) => {
              setDraft(event.target.value);
              if (!event.target.value.trim()) setQuery("");
            }}
            placeholder={homeCopy.globalSearchPlaceholder}
          />
        </div>
        <button type="submit" aria-label={copy.search}>
          <Icon name="search" />
        </button>
      </form>
      {showResults && (
        <section
          id="home-people-search-results"
          className="home-search-results"
          aria-label={homeCopy.globalSearchResults}
          aria-live="polite"
          aria-busy={state.loading}
        >
          {state.loading ? (
            <StatusMessage message={copy.loading} />
          ) : state.error ? (
            <StatusMessage message={state.error} error onRetry={state.reload} />
          ) : state.data?.length ? (
            state.data.map((user) => (
              <Link
                key={user.id}
                className="home-search-result"
                to={"/usuarios/" + encodeURIComponent(user.id)}
              >
                <Avatar name={user.nombre || user.username} />
                <span className="min-w-0">
                  <strong className="block truncate">{user.nombre}</strong>
                  <span className="muted block truncate text-xs">
                    @{user.username}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <p className="muted px-4 py-3 text-sm">{homeCopy.searchEmpty}</p>
          )}
        </section>
      )}
    </div>
  );
}
