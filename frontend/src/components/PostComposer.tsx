import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "./Button";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { useAuth } from "../hooks/useAuth";
import { StatusMessage } from "./StatusMessage";
import { postsCopy } from "../content/posts-copy";
import { posts } from "../services/posts";
import { errorMessage } from "../lib/api";

interface PostComposerProps {
  readonly onPublished?: () => void;
  readonly children?: never;
}
export function PostComposer({ onPublished }: PostComposerProps) {
  const { session } = useAuth();
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ file: File; url: string }>();
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const request = useRef<AbortController | null>(null);
  const count = [...text.trim()].length;
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const element = textArea.current;
    if (!element) return;
    element.style.height = "auto";
    const maxHeight = 180;
    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
    element.style.overflowY =
      element.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [text]);
  function removeImage() {
    setImage(undefined);
    if (fileInput.current) fileInput.current.value = "";
  }
  function selectImage(file: File | undefined) {
    setError("");
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/gif"].includes(file.type) ||
      file.size > 5 * 1024 * 1024 ||
      !file.size
    ) {
      removeImage();
      setError(postsCopy.invalidImage);
      return;
    }
    setImage({ file, url: URL.createObjectURL(file) });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (request.current) return;
    setError("");
    setCreated("");
    if (count < 1 || count > 5000) {
      setError(postsCopy.invalidText);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const post = await posts.create(text, image?.file, controller.signal);
      if (controller.signal.aborted) return;
      setCreated(post.id);
      setText("");
      removeImage();
      onPublished?.();
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        request.current = null;
      }
    }
  }
  return (
    <section
      id="nueva-publicacion"
      className="home-composer"
      aria-label={postsCopy.compose}
    >
      <Avatar name={session?.user.nombre ?? ""} />
      <form
        onSubmit={submit}
        className="min-w-0 flex-1 space-y-3"
        aria-busy={busy}
      >
        <div className="field">
          <label className="sr-only" htmlFor="post-text">
            {postsCopy.text}
          </label>
          <textarea
            id="post-text"
            ref={textArea}
            className="compose-text"
            rows={1}
            placeholder={
              "¿Qué estás pensando, " +
              (session?.user.nombre.split(" ")[0] ?? "") +
              "?"
            }
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={busy}
            required
            aria-describedby="post-count"
          />
          <p id="post-count" className="muted text-right text-[10px]">
            {count} / 5000
          </p>
        </div>
        {image && (
          <div className="space-y-2">
            <img
              src={image.url}
              alt={postsCopy.preview}
              className="max-h-72 w-full rounded-lg object-contain"
            />
            <Button variant="ghost" disabled={busy} onClick={removeImage}>
              {postsCopy.removeImage}
            </Button>
          </div>
        )}
        <div className="compose-tools">
          <label htmlFor="post-image" className="image-picker">
            <Icon name="image" />
            {image?.file.name ?? postsCopy.image}
          </label>
          <input
            id="post-image"
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            disabled={busy}
            onChange={(event) => selectImage(event.target.files?.[0])}
            className="sr-only"
            aria-describedby="post-image-help"
          />
          <p id="post-image-help" className="sr-only">
            {postsCopy.imageHelp}
          </p>
          <Button type="submit" disabled={busy || !count || count > 5000}>
            {busy ? postsCopy.publishing : postsCopy.publish}
          </Button>
        </div>
        {error && <StatusMessage message={error} error />}
        {created && (
          <div className="status" role="status">
            {postsCopy.created}{" "}
            <Link
              to={"/posts/" + encodeURIComponent(created)}
              className="text-link"
            >
              {postsCopy.view}
            </Link>
          </div>
        )}
      </form>
    </section>
  );
}
