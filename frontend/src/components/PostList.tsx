import type { ReactNode } from "react";
import { Link } from "react-router";
import { usePostPages } from "../hooks/usePostPages";
import { copy } from "../content/copy";
import { postsCopy } from "../content/posts-copy";
import { PostCard } from "./PostCard";
import { Button } from "./Button";
import { Card } from "./Card";
import { StatusMessage } from "./StatusMessage";
import type { Post } from "../types/posts";

interface PostListProps<T extends Post> {
  readonly path: string;
  readonly feed?: boolean;
  /** Optional content shown above each card, such as why a post was discovered. */
  readonly renderContext?: (post: T) => ReactNode;
  /** Replaces the default empty state of the feed or the profile. */
  readonly empty?: ReactNode;
}
// Callers key this component by the endpoint and refresh version.
export function PostList<T extends Post = Post>({
  path,
  feed = false,
  renderContext,
  empty,
}: PostListProps<T>) {
  const state = usePostPages<T>(path);
  return (
    <div className="space-y-5" aria-busy={state.loading}>
      {state.items.map((post) =>
        renderContext ? (
          <div key={post.id} className="post-with-context">
            {renderContext(post)}
            <PostCard post={post} />
          </div>
        ) : (
          <PostCard key={post.id} post={post} />
        ),
      )}
      {state.error && (
        <StatusMessage message={state.error} error onRetry={state.load} />
      )}
      {state.loading && <StatusMessage message={copy.loading} />}
      {!state.loading &&
        !state.error &&
        !state.items.length &&
        (empty ?? (
          <Card className="empty-panel">
            {feed ? (
              <>
                <h2>{postsCopy.emptyFeed}</h2>
                <p className="muted max-w-md">{postsCopy.emptyFeedBody}</p>
                <Link className="button button-primary" to="/explorar">
                  {copy.explore}
                </Link>
              </>
            ) : (
              <p className="muted">{postsCopy.emptyProfile}</p>
            )}
          </Card>
        ))}
      {!!state.items.length &&
        !state.error &&
        (state.more ? (
          <Button
            className="w-full"
            variant="secondary"
            disabled={state.loading}
            onClick={state.load}
          >
            {postsCopy.more}
          </Button>
        ) : (
          <p className="muted text-center text-sm" role="status">
            {postsCopy.end}
          </p>
        ))}
    </div>
  );
}
