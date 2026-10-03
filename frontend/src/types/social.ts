import type { UserSummary } from "./api";
export interface Suggestion extends UserSummary {
  readonly enComun: number;
  readonly conexiones: readonly string[];
  readonly seguidores: number;
}
export interface ReachableUser extends UserSummary {
  readonly distancia: number;
  // Usernames in between on the shortest path; empty at distance 1.
  readonly via: readonly string[];
}
export interface Separation {
  readonly grados: number | null;
  readonly cadena: readonly string[];
}
