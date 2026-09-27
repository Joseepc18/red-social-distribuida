import { copy } from "../content/copy";
import { getSession, setSession } from "./session";
import type { ApiErrorBody } from "../types/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, body: ApiErrorBody) {
    super(body.mensaje);
    this.name = "ApiError";
    this.status = status;
    this.code = body.error;
  }
}
interface ApiOptions extends RequestInit {
  readonly auth?: boolean;
  readonly token?: string;
}
export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("API paths must be relative");
  const { auth = true, token: explicitToken, ...init } = options;
  const token = auth ? (explicitToken ?? getSession()?.token) : undefined;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", "Bearer " + token);
  let response: Response;
  try {
    response = await fetch("/api" + path, { ...init, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(0, { error: "CONEXION", mensaje: copy.connectionError });
  }
  if (response.status === 401 && token && getSession()?.token === token)
    setSession(null);
  if (!response.ok) {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = (await response.json()) ?? {};
    } catch {
      /* Proxies may return non-JSON errors. */
    }
    throw new ApiError(response.status, {
      error:
        typeof body.error === "string" ? body.error : "HTTP_" + response.status,
      mensaje:
        typeof body.mensaje === "string"
          ? body.mensaje
          : response.status === 401
            ? copy.sessionExpired
            : copy.serverError,
    });
  }
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, {
      error: "RESPUESTA_INVALIDA",
      mensaje: copy.invalidResponse,
    });
  }
}
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : copy.serverError;
}
