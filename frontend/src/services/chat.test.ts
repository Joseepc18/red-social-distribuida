import { afterEach, expect, test, vi } from "vitest";
import { api, ApiError } from "../lib/api";
import { chat } from "./chat";

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  api: vi.fn(),
}));
const mockedApi = vi.mocked(api);
const unavailable = (status: number) =>
  new ApiError(status, { error: "TEMPORAL", mensaje: "Temporal" });

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

test("recupera el historial tras errores temporales conservando el cursor", async () => {
  vi.useFakeTimers();
  const page = {
    mensajes: [{ texto: "Durante la desconexión" }],
    siguienteAntes: null,
  };
  mockedApi
    .mockRejectedValueOnce(unavailable(504))
    .mockRejectedValueOnce(unavailable(0))
    .mockResolvedValueOnce(page);
  const result = chat.history("conversacion", "cursor+original");
  await vi.runAllTimersAsync();
  await expect(result).resolves.toBe(page);
  expect(mockedApi).toHaveBeenCalledTimes(3);
  for (const [path, options] of mockedApi.mock.calls) {
    expect(path).toBe(
      "/conversaciones/conversacion/mensajes?antes=cursor%2Boriginal",
    );
    expect(options?.method).toBeUndefined();
  }
});

test("agota los reintentos y devuelve el error en vez de consultar indefinidamente", async () => {
  vi.useFakeTimers();
  const error = unavailable(503);
  mockedApi.mockRejectedValue(error);
  const assertion = expect(chat.history("id", null)).rejects.toBe(error);
  await vi.runAllTimersAsync();
  await assertion;
  expect(mockedApi).toHaveBeenCalledTimes(3);
});

test.each([400, 401, 403, 404, 500])(
  "no reintenta un error HTTP %s",
  async (status) => {
    mockedApi.mockRejectedValue(unavailable(status));
    await expect(chat.history("id", null)).rejects.toMatchObject({ status });
    expect(mockedApi).toHaveBeenCalledTimes(1);
  },
);

test("abortar durante la espera impide otra petición", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  mockedApi.mockRejectedValue(unavailable(502));
  const assertion = expect(
    chat.history("id", null, controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(1);
  controller.abort();
  await assertion;
  await vi.runAllTimersAsync();
  expect(mockedApi).toHaveBeenCalledTimes(1);
});
