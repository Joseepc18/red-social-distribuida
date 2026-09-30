import { api } from "../lib/api";
import type { UserSummary } from "../types/api";
import type { Suggestion, ReachableUser, Separation } from "../types/social";
export const social = {
  suggestions: (signal: AbortSignal) =>
    api<Suggestion[]>("/usuarios/me/sugerencias", { signal }),
  reach: (signal: AbortSignal) =>
    api<ReachableUser[]>("/usuarios/me/alcance", { signal }),
  mutuals: (id: string, signal: AbortSignal) =>
    api<UserSummary[]>("/usuarios/" + encodeURIComponent(id) + "/en-comun", {
      signal,
    }),
  separation: (id: string, signal: AbortSignal) =>
    api<Separation>("/usuarios/" + encodeURIComponent(id) + "/separacion", {
      signal,
    }),
};
