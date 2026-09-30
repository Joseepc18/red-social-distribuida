import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { useRemote } from "../hooks/useRemote";
import { posts } from "../services/posts";
import { PostCard } from "../components/PostCard";
import { StatusMessage } from "../components/StatusMessage";
import { copy } from "../content/copy";
import { postsCopy } from "../content/posts-copy";

interface PostPageProps {
  readonly children?: never;
}
export function PostPage(_props: PostPageProps) {
  const { id = "" } = useParams();
  const load = useCallback(
    (signal: AbortSignal) => posts.find(id, signal),
    [id],
  );
  const state = useRemote(id, load);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/feed" className="text-link">
        {copy.feed}
      </Link>
      <h1>{postsCopy.detail}</h1>
      {state.loading && <StatusMessage message={copy.loading} />}
      {state.error && (
        <StatusMessage message={state.error} error onRetry={state.reload} />
      )}
      {state.data && <PostCard key={state.data.id} post={state.data} detail />}
    </div>
  );
}
