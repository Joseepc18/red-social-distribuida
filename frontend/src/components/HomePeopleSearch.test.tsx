import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HomePeopleSearch } from "./HomePeopleSearch";
import { users } from "../services/users";

vi.mock("../services/users", () => ({ users: { search: vi.fn() } }));

const search = vi.mocked(users.search);

beforeEach(() => {
  vi.useFakeTimers();
  search.mockResolvedValue([
    { id: "u1", username: "gabriela", nombre: "Gabriela Soto" },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
  search.mockReset();
});

function renderSearch() {
  render(
    <MemoryRouter>
      <HomePeopleSearch />
    </MemoryRouter>,
  );
  return screen.getByRole("searchbox");
}

function type(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

it("searches once, 300 ms after the last keystroke", async () => {
  const input = renderSearch();

  type(input, "g");
  act(() => vi.advanceTimersByTime(100));
  type(input, "ga");
  act(() => vi.advanceTimersByTime(100));
  type(input, "gab");
  act(() => vi.advanceTimersByTime(299));
  expect(search).not.toHaveBeenCalled();

  await act(async () => vi.advanceTimersByTime(1));
  expect(search).toHaveBeenCalledTimes(1);
  expect(search).toHaveBeenCalledWith("gab", expect.any(AbortSignal));
  expect(screen.getByRole("link", { name: /Gabriela Soto/ })).toBeVisible();
});

it("submitting searches immediately without waiting for the debounce", async () => {
  const input = renderSearch();

  type(input, "gab");
  await act(async () => fireEvent.submit(input.closest("form")!));
  expect(search).toHaveBeenCalledTimes(1);

  await act(async () => vi.advanceTimersByTime(300));
  expect(search).toHaveBeenCalledTimes(1);
});

it("keeps the panel open while typing until the new results arrive", async () => {
  let resolveGab: (
    value: Awaited<ReturnType<typeof users.search>>,
  ) => void = () => undefined;
  search.mockImplementation((query) =>
    query === "gab"
      ? new Promise((resolve) => (resolveGab = resolve))
      : Promise.resolve([
          { id: "u1", username: "gabriela", nombre: "Gabriela Soto" },
          { id: "u2", username: "elena", nombre: "Elena Vargas" },
        ]),
  );
  const input = renderSearch();

  type(input, "ga");
  await act(async () => vi.advanceTimersByTime(300));
  expect(screen.getByRole("link", { name: /Elena Vargas/ })).toBeVisible();

  type(input, "gab");
  expect(screen.getByRole("region")).toBeVisible();
  expect(screen.getByRole("link", { name: /Elena Vargas/ })).toBeVisible();

  await act(async () => vi.advanceTimersByTime(300));
  expect(search).toHaveBeenLastCalledWith("gab", expect.any(AbortSignal));
  expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "true");

  await act(async () =>
    resolveGab([{ id: "u1", username: "gabriela", nombre: "Gabriela Soto" }]),
  );
  expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "false");
  expect(screen.getByRole("link", { name: /Gabriela Soto/ })).toBeVisible();
  expect(screen.queryByRole("link", { name: /Elena Vargas/ })).toBeNull();
});

it("blank text never searches and hides the results", async () => {
  const input = renderSearch();

  type(input, "gab");
  await act(async () => vi.advanceTimersByTime(300));
  expect(screen.getByRole("link", { name: /Gabriela Soto/ })).toBeVisible();

  type(input, "   ");
  await act(async () => vi.advanceTimersByTime(300));
  expect(search).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("link", { name: /Gabriela Soto/ })).toBeNull();
});
