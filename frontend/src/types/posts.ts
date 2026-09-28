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
}
