import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useSuggestions } from "../hooks/useSuggestions";
import { copy } from "../content/copy";
import { postsCopy } from "../content/posts-copy";
import { socialCopy } from "../content/social-copy";
import { PostComposer } from "../components/PostComposer";
import { PostList } from "../components/PostList";
import { SuggestionCard } from "../components/SuggestionCard";
import { StatusMessage } from "../components/StatusMessage";
import { Button } from "../components/Button";

interface FeedPageProps {
  readonly children?: never;
}
export function FeedPage(_props: FeedPageProps) {
  const { session } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (location.hash === "#nueva-publicacion")
      document.getElementById("post-text")?.focus();
  }, [location]);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((value) => value + 1);
  const suggestions = useSuggestions(refresh);
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{copy.member}</p>
        <h1>{copy.feed}</h1>
        <p className="muted mt-3">{postsCopy.intro}</p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-6">
          <PostComposer key={session?.token} />
          <div className="flex justify-end">
            <Button variant="secondary" onClick={refresh}>
              {postsCopy.refresh}
            </Button>
          </div>
          <PostList key={session?.token + ":" + version} path="/feed" feed />
        </div>
        <aside
          className="min-w-0 space-y-4"
          aria-label={socialCopy.suggestions}
        >
          <h2>{socialCopy.suggestions}</h2>
          {suggestions.loading && <StatusMessage message={copy.loading} />}
          {suggestions.error && (
            <StatusMessage
              message={suggestions.error}
              error
              onRetry={suggestions.reload}
            />
          )}
          {suggestions.mutationError && (
            <StatusMessage message={suggestions.mutationError} error />
          )}
          {suggestions.notice && <StatusMessage message={suggestions.notice} />}
          {suggestions.data?.slice(0, 3).map((user) => (
            <SuggestionCard
              key={user.id}
              user={user}
              busy={suggestions.busyId === user.id}
              disabled={!!suggestions.busyId}
              onFollow={suggestions.follow}
            />
          ))}
          {suggestions.data?.length === 0 && (
            <p className="muted text-sm">{socialCopy.suggestionsEmpty}</p>
          )}
          <Link className="text-link inline-block py-2" to="/explorar">
            {copy.explore}
          </Link>
        </aside>
      </div>
    </div>
  );
}
