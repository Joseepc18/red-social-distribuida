import { Link } from "react-router";
import { Avatar } from "./Avatar";
import { CommentComposer } from "./CommentComposer";
import { commentsCopy } from "../content/comments-copy";
import type { CommentNode } from "../lib/comments";

// Past this depth replies keep the thread line but stop moving right, so deep
// threads never overflow a phone screen.
const MAX_INDENT_DEPTH = 3;

interface CommentThreadProps {
  readonly node: CommentNode;
  readonly depth: number;
  readonly expanded: ReadonlySet<string>;
  readonly replyingTo: string | null;
  readonly onToggle: (id: string) => void;
  readonly onReply: (id: string | null) => void;
  readonly onSubmitReply: (parentId: string, text: string) => Promise<void>;
}
export function CommentThread({
  node,
  depth,
  expanded,
  replyingTo,
  onToggle,
  onReply,
  onSubmitReply,
}: CommentThreadProps) {
  const { comment, replies } = node;
  const date = new Date(comment.fecha);
  const profilePath = "/usuarios/" + encodeURIComponent(comment.autor.id);
  const open = expanded.has(comment.id);
  const firstName = comment.autor.nombre.split(" ")[0];
  return (
    <li className="comment">
      <article className="comment-body" aria-label={comment.autor.nombre}>
        <Link
          to={profilePath}
          className="shrink-0 rounded-full"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Avatar name={comment.autor.nombre} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="comment-meta">
            <Link className="text-link break-words" to={profilePath}>
              {comment.autor.nombre}
            </Link>
            <span className="muted break-all">@{comment.autor.username}</span>
            <time className="muted" dateTime={comment.fecha}>
              {Number.isNaN(date.getTime())
                ? comment.fecha
                : date.toLocaleString("es", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
            </time>
          </p>
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {comment.texto}
          </p>
          <div className="comment-actions">
            <button
              type="button"
              className="comment-action"
              aria-expanded={replyingTo === comment.id}
              onClick={() =>
                onReply(replyingTo === comment.id ? null : comment.id)
              }
            >
              {commentsCopy.reply}
            </button>
            {replies.length > 0 && (
              <button
                type="button"
                className="comment-action"
                aria-expanded={open}
                onClick={() => onToggle(comment.id)}
              >
                {open
                  ? commentsCopy.hideReplies
                  : commentsCopy.showReplies(replies.length)}
              </button>
            )}
          </div>
          {replyingTo === comment.id && (
            <CommentComposer
              id={"reply-" + comment.id}
              label={commentsCopy.replyText(comment.autor.nombre)}
              placeholder={commentsCopy.replyPlaceholder(firstName)}
              submitLabel={commentsCopy.reply}
              autoFocus
              onSubmit={(text) => onSubmitReply(comment.id, text)}
              onCancel={() => onReply(null)}
            />
          )}
        </div>
      </article>
      {open && replies.length > 0 && (
        <ul
          className={
            "comment-replies" +
            (depth + 1 > MAX_INDENT_DEPTH ? " comment-replies-flat" : "")
          }
        >
          {replies.map((reply) => (
            <CommentThread
              key={reply.comment.id}
              node={reply}
              depth={depth + 1}
              expanded={expanded}
              replyingTo={replyingTo}
              onToggle={onToggle}
              onReply={onReply}
              onSubmitReply={onSubmitReply}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
