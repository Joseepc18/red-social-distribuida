import { useCallback, useMemo, useState } from "react";
import { CommentComposer } from "./CommentComposer";
import { CommentThread } from "./CommentThread";
import { StatusMessage } from "./StatusMessage";
import { useRemote } from "../hooks/useRemote";
import { copy } from "../content/copy";
import { commentsCopy } from "../content/comments-copy";
import { buildThread } from "../lib/comments";
import { posts } from "../services/posts";
import type { Comment } from "../types/posts";

interface PostCommentsProps {
  readonly postId: string;
  /** Called after each comment or reply the server confirms. */
  readonly onCommented?: () => void;
}
export function PostComments({ postId, onCommented }: PostCommentsProps) {
  const load = useCallback(
    (signal: AbortSignal) => posts.comments(postId, signal),
    [postId],
  );
  const state = useRemote(postId, load);
  // Comments created here are shown at once, without reloading the thread.
  const [created, setCreated] = useState<readonly Comment[]>([]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const thread = useMemo(() => {
    const byId = new Map<string, Comment>();
    for (const comment of [...(state.data ?? []), ...created])
      byId.set(comment.id, comment);
    return buildThread([...byId.values()]);
  }, [state.data, created]);

  async function publish(text: string, parentId: string | null) {
    const comment = await posts.comment(postId, text, parentId);
    setCreated((list) => [...list, comment]);
    if (parentId) {
      setExpanded((ids) => new Set(ids).add(parentId));
      setReplyingTo(null);
    }
    onCommented?.();
  }
  function toggle(id: string) {
    setExpanded((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <section
      id="comentarios"
      className="card comments"
      aria-labelledby="comments-title"
    >
      <h2 id="comments-title">{commentsCopy.title}</h2>
      <CommentComposer
        id="comment-text"
        label={commentsCopy.text}
        placeholder={commentsCopy.placeholder}
        submitLabel={commentsCopy.submit}
        onSubmit={(text) => publish(text, null)}
      />
      {state.loading && <StatusMessage message={copy.loading} />}
      {state.error && (
        <StatusMessage message={state.error} error onRetry={state.reload} />
      )}
      {state.data && thread.length === 0 && (
        <p className="muted">{commentsCopy.empty}</p>
      )}
      {thread.length > 0 && (
        <ul className="comment-list">
          {thread.map((node) => (
            <CommentThread
              key={node.comment.id}
              node={node}
              depth={0}
              expanded={expanded}
              replyingTo={replyingTo}
              onToggle={toggle}
              onReply={setReplyingTo}
              onSubmitReply={(parentId, text) => publish(text, parentId)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
