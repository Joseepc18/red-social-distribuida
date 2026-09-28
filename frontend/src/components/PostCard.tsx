import { useState } from "react";
import { Link } from "react-router";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { postsCopy } from "../content/posts-copy";
import { postImagePath, posts } from "../services/posts";
import type { Post } from "../types/posts";

interface PostCardProps {
  readonly post: Post;
  readonly detail?: boolean;
}
export function PostCard({ post, detail = false }: PostCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [reacted, setReacted] = useState(post.reaccionado ?? false);
  const [reactionCount, setReactionCount] = useState(post.reacciones ?? 0);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [reactionError, setReactionError] = useState("");
  const image = postImagePath(post);
  const date = new Date(post.fecha);
  async function toggleReaction() {
    if (reactionBusy || post.reacciones === undefined) return;
    setReactionBusy(true);
    setReactionError("");
    try {
      await posts.setReaction(post.id, reacted);
      setReacted((value) => !value);
      setReactionCount((value) => Math.max(0, value + (reacted ? -1 : 1)));
    } catch {
      setReactionError(postsCopy.reactionError);
    } finally {
      setReactionBusy(false);
    }
  }
  return (
    <article className="card min-w-0 space-y-5">
      <header className="flex items-start gap-3">
        <Avatar name={post.autor.nombre} />
        <div className="min-w-0">
          <Link
            className="text-link break-words"
            to={"/usuarios/" + encodeURIComponent(post.autor.id)}
          >
            {post.autor.nombre}
          </Link>
          <p className="muted break-all text-xs">@{post.autor.username}</p>
          <time className="muted mt-1 block text-xs" dateTime={post.fecha}>
            {Number.isNaN(date.getTime())
              ? post.fecha
              : date.toLocaleString("es", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
          </time>
        </div>
      </header>
      <p className="whitespace-pre-wrap break-words leading-relaxed">
        {post.texto}
      </p>
      {image &&
        (imageFailed ? (
          <p className="status">{postsCopy.imageError}</p>
        ) : (
          <img
            src={image}
            alt={postsCopy.imageAlt}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="max-h-[32rem] w-full rounded-lg bg-surface-container-low object-contain dark:bg-on-surface"
          />
        ))}
      {(!detail || typeof post.reacciones === "number") && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 pt-4 text-sm">
          {typeof post.reacciones === "number" && (
            <button
              type="button"
              className={
                "button button-ghost !min-h-9 !px-2 " +
                (reacted
                  ? "text-primary-container dark:text-inverse-primary"
                  : "")
              }
              aria-pressed={reacted}
              aria-label={reacted ? postsCopy.unreact : postsCopy.react}
              disabled={reactionBusy}
              onClick={toggleReaction}
            >
              <Icon name="heart" />
              {postsCopy.reactions(reactionCount)}
            </button>
          )}
          {!detail && (
            <Link
              className="text-link"
              to={"/posts/" + encodeURIComponent(post.id)}
            >
              {postsCopy.view}
            </Link>
          )}
        </footer>
      )}
      {reactionError && (
        <p className="status-error" role="alert">
          {reactionError}
        </p>
      )}
    </article>
  );
}
