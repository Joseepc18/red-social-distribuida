import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePushNotifications } from "./usePushNotifications";
import { inspectPush } from "../services/push";

vi.mock("../services/push", () => ({
  pushSupported: () => true,
  inspectPush: vi.fn().mockResolvedValue(true),
  disablePush: vi.fn(),
  enablePush: vi.fn(),
  pushError: () => "error",
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("registers on mount but only inspects local state on focus", async () => {
  vi.stubGlobal("Notification", { permission: "granted" });
  const { result } = renderHook(() => usePushNotifications("u1", "token"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(inspectPush).toHaveBeenLastCalledWith("u1", "token", true);
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(inspectPush).toHaveBeenLastCalledWith("u1", "token", false);
});
