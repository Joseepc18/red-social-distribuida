import { useState, type FormEvent } from "react";
import { Button } from "./Button";
import { StatusMessage } from "./StatusMessage";
import { commentsCopy } from "../content/comments-copy";
import { COMMENT_MAX_CHARS, commentLength } from "../lib/comments";
import { errorMessage } from "../lib/api";

interface CommentComposerProps {
  /** Id of the textarea; the counter and the error hang from it. */
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly submitLabel: string;
  readonly autoFocus?: boolean;
  /** Rejects with an ApiError to show its message and keep the draft. */
  readonly onSubmit: (text: string) => Promise<void>;
  readonly onCancel?: () => void;
}
export function CommentComposer({
  id,
  label,
  placeholder,
  submitLabel,
  autoFocus = false,
  onSubmit,
  onCancel,
}: CommentComposerProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const count = commentLength(text);
  const tooLong = count > COMMENT_MAX_CHARS;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (count < 1 || tooLong) {
      setError(commentsCopy.invalid);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(text);
      setText("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="comment-composer" onSubmit={submit} aria-busy={busy}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="comment-text"
        rows={2}
        placeholder={placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={busy}
        autoFocus={autoFocus}
        aria-describedby={count > 0 ? id + "-count" : undefined}
      />
      <div className="comment-composer-tools">
        {count > 0 && (
          <span
            id={id + "-count"}
            className={
              "text-[11px] " +
              (tooLong
                ? "font-semibold text-error dark:text-error-container"
                : "muted")
            }
          >
            {count} / {COMMENT_MAX_CHARS}
          </span>
        )}
        {onCancel && (
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {commentsCopy.cancel}
          </Button>
        )}
        <Button type="submit" disabled={busy || !count || tooLong}>
          {busy ? commentsCopy.sending : submitLabel}
        </Button>
      </div>
      {error && <StatusMessage message={error} error />}
    </form>
  );
}
