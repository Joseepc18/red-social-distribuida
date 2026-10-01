import { expect, it } from "vitest";
import { PREVIEW_MAX_CHARS, PREVIEW_MAX_LINES, textPreview } from "./text";

it("keeps short texts whole", () => {
  expect(textPreview("Hola a todos")).toBeNull();
  expect(textPreview("a".repeat(PREVIEW_MAX_CHARS))).toBeNull();
});

it("cuts long texts at the last word boundary", () => {
  const text = "palabra ".repeat(60).trim();

  const preview = textPreview(text)!;

  expect([...preview].length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
  expect(preview.endsWith("palabra")).toBe(true);
  expect(text.startsWith(preview)).toBe(true);
});

it("cuts a single long word at the character limit", () => {
  expect(textPreview("a".repeat(400))).toBe("a".repeat(PREVIEW_MAX_CHARS));
});

it("cuts texts with too many lines even when they are short", () => {
  const lines = Array.from({ length: 10 }, (_, index) => "línea " + index);

  expect(textPreview(lines.join("\n"))).toBe(
    lines.slice(0, PREVIEW_MAX_LINES).join("\n"),
  );
});

it("counts emoji as a single character", () => {
  expect(textPreview("😀".repeat(PREVIEW_MAX_CHARS))).toBeNull();
});
