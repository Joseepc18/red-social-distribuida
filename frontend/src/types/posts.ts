import type { UserSummary } from "./api";

export interface Post {
  readonly id: string;
  readonly texto: string;
  readonly fecha: string;
  readonly autor: UserSummary;
  readonly mediaKey: string | null;
  readonly mediaTipo: string | null;
  readonly mediaUrl: string | null;
  // Every listing (feed, discover, detail and profile) sends the same counters;
  // comentarios includes the replies. The card hides a counter that is missing.
  readonly reacciones?: number;
  readonly reaccionado?: boolean;
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
