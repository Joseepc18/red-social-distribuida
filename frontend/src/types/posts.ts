import type { UserSummary } from "./api";

export interface Post {
  readonly id: string;
  readonly texto: string;
  readonly fecha: string;
  readonly autor: UserSummary;
  readonly mediaKey: string | null;
  readonly mediaTipo: string | null;
  readonly mediaUrl: string | null;
  // Only the feed contract currently supplies reaction state.
  readonly reacciones?: number;
  readonly reaccionado?: boolean;
  // Feed, detail and profile count every comment, replies included; discover does not.
  readonly comentarios?: number;
}

export interface Comment {
  readonly id: string;
  readonly texto: string;
  readonly fecha: string;
  readonly autor: UserSummary;
  // null for comments made directly on the post.
  readonly respondeA: string | null;
  readonly respuestas: number;
}
