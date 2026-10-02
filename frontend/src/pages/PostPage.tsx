import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";
import { useRemote } from "../hooks/useRemote";
import { posts } from "../services/posts";
import { PostCard } from "../components/PostCard";
import { PostComments } from "../components/PostComments";
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
  // Comments made on this page raise the card counter without reloading the post.
  const [added, setAdded] = useState({ id, count: 0 });
  const newComments = added.id === id ? added.count : 0;
  const post =
    state.data && typeof state.data.comentarios === "number"
      ? { ...state.data, comentarios: state.data.comentarios + newComments }
      : state.data;
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
      {post && (
        <>
          <PostCard key={post.id} post={post} detail />
          <PostComments
            key={"comments-" + post.id}
            postId={post.id}
            onCommented={() =>
              setAdded((value) => ({
                id,
                count: (value.id === id ? value.count : 0) + 1,
              }))
            }
          />
        </>
      )}
    </div>
  );
}
