import { posts } from "../services/posts";
import { useRemote } from "../hooks/useRemote";
import { PostCard } from "./PostCard";
import { StatusMessage } from "./StatusMessage";
import { postsCopy } from "../content/posts-copy";
import { copy, homeCopy } from "../content/copy";
interface DiscoverListProps {
  readonly children?: never;
}
export function DiscoverList(_props: DiscoverListProps) {
  const state = useRemote("home-discover", posts.discover);
  return (
    <section aria-label={homeCopy.suggestedPosts} className="timeline-posts">
      {state.loading && <StatusMessage message={copy.loading} />}
      {state.error && (
        <StatusMessage message={state.error} error onRetry={state.reload} />
      )}
      {state.data?.length === 0 && (
        <div className="empty-panel p-6">
          <h2>{postsCopy.discover}</h2>
          <p className="muted max-w-sm">{postsCopy.discoverEmpty}</p>
        </div>
      )}
      {state.data?.map((post) => (
        <div key={post.id} className="discovered-post">
          <p className="discovery-reason">
            {postsCopy.reactedByFollowing(post.amigosQueReaccionaron)}
          </p>
          <PostCard post={post} />
        </div>
      ))}
    </section>
  );
}
