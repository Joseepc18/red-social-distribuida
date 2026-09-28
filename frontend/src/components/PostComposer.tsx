import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "./Button";
import { Card } from "./Card";
import { StatusMessage } from "./StatusMessage";
import { postsCopy } from "../content/posts-copy";
import { posts } from "../services/posts";
import { errorMessage } from "../lib/api";

interface PostComposerProps {
  readonly children?: never;
}
export function PostComposer(_props: PostComposerProps) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ file: File; url: string }>();
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const count = [...text.trim()].length;
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  useEffect(() => () => request.current?.abort(), []);
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
    <Card id="nueva-publicacion">
      <h2 className="mb-5">{postsCopy.compose}</h2>
      <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
        <div className="field">
          <label htmlFor="post-text">{postsCopy.text}</label>
          <textarea
            id="post-text"
            className="input min-h-32 resize-y"
            placeholder={postsCopy.placeholder}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={busy}
            required
            aria-describedby="post-count"
          />
          <p id="post-count" className="muted text-right text-xs">
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
        <div className="field">
          <label htmlFor="post-image">{postsCopy.image}</label>
          <input
            id="post-image"
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            disabled={busy}
            onChange={(event) => selectImage(event.target.files?.[0])}
            className="w-full min-w-0 text-sm"
            aria-describedby="post-image-help"
          />
          <p id="post-image-help" className="muted text-xs">
            {postsCopy.imageHelp}
          </p>
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
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !count || count > 5000}>
            {busy ? postsCopy.publishing : postsCopy.publish}
          </Button>
        </div>
      </form>
    </Card>
  );
}
