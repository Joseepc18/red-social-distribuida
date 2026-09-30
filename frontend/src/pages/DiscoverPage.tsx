import { useCallback } from "react";
import { Button } from "../components/Button";
import { PostCard } from "../components/PostCard";
import { StatusMessage } from "../components/StatusMessage";
import { copy } from "../content/copy";
import { postsCopy } from "../content/posts-copy";
import { useRemote } from "../hooks/useRemote";
import { posts } from "../services/posts";

interface DiscoverPageProps {
  readonly children?: never;
}

export function DiscoverPage(_props: DiscoverPageProps) {
  const load = useCallback((signal: AbortSignal) => posts.discover(signal), []);
  const { data, error, loading, reload } = useRemote("discover", load);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <p className="eyebrow">{copy.member}</p>
        <h1>{postsCopy.discover}</h1>
        <p className="muted mt-3">{postsCopy.discoverIntro}</p>
      </header>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={reload}>
          {postsCopy.discoverRefresh}
        </Button>
      </div>
      {loading && <StatusMessage message={copy.loading} />}
      {error && <StatusMessage message={error} error onRetry={reload} />}
      {data?.length === 0 && (
        <StatusMessage message={postsCopy.discoverEmpty} />
      )}
      {data && data.length > 0 && (
        <section aria-label={postsCopy.discover} className="space-y-5">
          {data.map((post) => (
            <div key={post.id} className="space-y-2">
              <p className="muted px-1 text-sm">
                {postsCopy.reactedByFollowing(post.amigosQueReaccionaron)}
              </p>
              <PostCard post={post} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
