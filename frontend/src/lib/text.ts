export const PREVIEW_MAX_CHARS = 280;
export const PREVIEW_MAX_LINES = 6;

/**
 * Returns the shortened text a long post shows before "Mostrar más",
 * or null when the whole text already fits. Counts code points, like the composer.
 */
export function textPreview(text: string): string | null {
  const lines = text.split("\n");
  let preview =
    lines.length > PREVIEW_MAX_LINES
      ? lines.slice(0, PREVIEW_MAX_LINES).join("\n")
      : text;
  const chars = [...preview];
  if (chars.length > PREVIEW_MAX_CHARS) {
    preview = chars.slice(0, PREVIEW_MAX_CHARS).join("");
    // Cut at the last word boundary unless that would drop too much text.
    const lastSpace = preview.search(/\s\S*$/);
    if (lastSpace > PREVIEW_MAX_CHARS / 2)
      preview = preview.slice(0, lastSpace);
  }
  return preview === text ? null : preview.trimEnd();
}
