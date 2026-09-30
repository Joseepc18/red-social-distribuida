import { api } from "../lib/api";
import type { Profile, UserSummary } from "../types/api";
export interface Credentials {
  readonly username: string;
  readonly password: string;
}
export interface Registration extends Credentials {
  readonly email: string;
  readonly nombre: string;
}
export const users = {
  login: (body: Credentials, signal?: AbortSignal) =>
    api<{ token: string }>("/auth/login", {
      auth: false,
      method: "POST",
      body: JSON.stringify(body),
      signal,
    }),
  register: (body: Registration, signal?: AbortSignal) =>
    api<Profile>("/auth/registro", {
      auth: false,
      method: "POST",
      body: JSON.stringify(body),
      signal,
    }),
  me: (signal?: AbortSignal, token?: string) =>
    api<Profile>("/usuarios/me", { signal, token }),
  update: (body: Pick<Profile, "nombre" | "bio">) =>
    api<Profile>("/usuarios/me", { method: "PUT", body: JSON.stringify(body) }),
  profile: (id: string, signal?: AbortSignal) =>
    api<Profile>("/usuarios/" + encodeURIComponent(id), { signal }),
  search: (query: string, signal?: AbortSignal) =>
    api<UserSummary[]>("/usuarios?q=" + encodeURIComponent(query), { signal }),
  followers: (id: string, signal?: AbortSignal) =>
    api<UserSummary[]>("/usuarios/" + encodeURIComponent(id) + "/seguidores", {
      signal,
    }),
  following: (id: string, signal?: AbortSignal) =>
    api<UserSummary[]>("/usuarios/" + encodeURIComponent(id) + "/seguidos", {
      signal,
    }),
  follow: (id: string, following: boolean) =>
    api<void>("/usuarios/" + encodeURIComponent(id) + "/seguir", {
      method: following ? "DELETE" : "POST",
    }),
};
