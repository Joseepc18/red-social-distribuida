import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { postsCopy } from "../content/posts-copy";
import { postImagePath, posts } from "../services/posts";
import { textPreview } from "../lib/text";
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
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const navigate = useNavigate();
  const image = postImagePath(post);
  const date = new Date(post.fecha);
  const formattedDate = Number.isNaN(date.getTime())
    ? post.fecha
    : date.toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
  const postPath = "/posts/" + encodeURIComponent(post.id);
  const profilePath = "/usuarios/" + encodeURIComponent(post.autor.id);
  const preview = detail || expanded ? null : textPreview(post.texto);
  // The whole card opens the post, except for its own links and buttons
  // and while the reader is selecting text.
  function openPost(event: MouseEvent<HTMLElement>) {
    if (detail) return;
    if ((event.target as Element).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    if (event.ctrlKey || event.metaKey) {
      window.open(postPath, "_blank", "noopener");
      return;
    }
    navigate(postPath);
  }
  // "Mostrar más" disappears once used: keep keyboard focus on the text it revealed.
  useEffect(() => {
    if (expanded) textRef.current?.focus();
  }, [expanded]);
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
    <article
      className={"card min-w-0 space-y-5" + (detail ? "" : " post-card-link")}
      onClick={openPost}
    >
      <header className="flex items-start gap-3">
        {/* Mouse shortcut to the profile: the name link already serves keyboards and screen readers. */}
        <Link
          to={profilePath}
          className="shrink-0 rounded-full"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Avatar name={post.autor.nombre} />
        </Link>
        <div className="min-w-0">
          <Link className="text-link break-words" to={profilePath}>
            {post.autor.nombre}
          </Link>
          <p className="muted break-all text-xs">@{post.autor.username}</p>
          {detail ? (
            <time className="muted mt-1 block text-xs" dateTime={post.fecha}>
              {formattedDate}
            </time>
          ) : (
            <Link to={postPath} className="post-date muted mt-1 block text-xs">
              <time dateTime={post.fecha}>{formattedDate}</time>
            </Link>
          )}
        </div>
      </header>
      <p
        ref={textRef}
        tabIndex={expanded ? -1 : undefined}
        className="whitespace-pre-wrap break-words leading-relaxed"
      >
        {preview === null ? post.texto : preview + "…"}
        {preview !== null && (
          <button
            type="button"
            className="post-more"
            onClick={() => setExpanded(true)}
          >
            {postsCopy.showMore}
          </button>
        )}
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
      {typeof post.reacciones === "number" && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 pt-4 text-sm">
          <button
            type="button"
            className={
              "button button-ghost !min-h-9 !px-2 " +
              (reacted
                ? "text-primary-container dark:text-inverse-primary"
                : "")
            }
            aria-pressed={reacted}
            aria-label={postsCopy.reactionLabel(reacted, reactionCount)}
            disabled={reactionBusy}
            onClick={toggleReaction}
          >
            <Icon name="heart" filled={reacted} />
            {postsCopy.reactions(reactionCount)}
          </button>
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
