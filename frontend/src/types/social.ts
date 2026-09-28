import type { UserSummary } from "./api";
export interface Suggestion extends UserSummary {
  readonly enComun: number;
  readonly conexiones: readonly string[];
  readonly seguidores: number;
}
export interface ReachableUser extends UserSummary {
  readonly distancia: number;
}
export interface Separation {
  readonly grados: number | null;
  readonly cadena: readonly string[];
}
