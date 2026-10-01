import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi, type Mock } from "vitest";
import { AnimatedBrandMark } from "./AnimatedBrandMark";

const FRAME_ID = 7;
let reduceMotion = false;
let requestFrame: Mock<(callback: FrameRequestCallback) => number>;
let cancelFrame: Mock<(id: number) => void>;

beforeEach(() => {
  reduceMotion = false;
  requestFrame = vi.fn((_callback: FrameRequestCallback) => FRAME_ID);
  cancelFrame = vi.fn((_id: number) => undefined);
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduceMotion && query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal("requestAnimationFrame", requestFrame);
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderMark(className?: string) {
  return render(
    <MemoryRouter>
      <AnimatedBrandMark className={className} />
    </MemoryRouter>,
  );
}

it("renders the five Z nodes, four links, four dots and the wordmark", () => {
  const { container, getByRole } = renderMark();

  expect(container.querySelectorAll(".brand-mark-node")).toHaveLength(5);
  expect(container.querySelectorAll(".brand-mark-link")).toHaveLength(4);
  expect(container.querySelectorAll(".brand-mark-dot")).toHaveLength(4);
  expect(container.querySelector("text")).toHaveTextContent("ZENIT");
  expect(getByRole("link", { name: "ZENIT" })).toHaveAttribute("href", "/");
});

it("applies the received className to size the logo", () => {
  const { getByRole } = renderMark("w-48");

  expect(getByRole("link", { name: "ZENIT" })).toHaveClass(
    "brand-mark",
    "w-48",
  );
});

it("moves the nodes and redraws the links that join them on each frame", () => {
  const { container } = renderMark();
  const node = container.querySelector(".brand-mark-node")!;
  const link = container.querySelector(".brand-mark-link")!;
  const before = [node.getAttribute("cx"), link.getAttribute("d")];

  const tick = requestFrame.mock.calls[0][0];
  tick(1500);

  expect([node.getAttribute("cx"), link.getAttribute("d")]).not.toEqual(before);
  expect(requestFrame).toHaveBeenCalledTimes(2);
});

it("does not schedule any frame when reduced motion is requested", () => {
  reduceMotion = true;
  renderMark();

  expect(requestFrame).not.toHaveBeenCalled();
});

it("cancels the pending frame when unmounted", () => {
  const { unmount } = renderMark();

  unmount();

  expect(cancelFrame).toHaveBeenCalledWith(FRAME_ID);
});

it("gives each instance its own gradient id", () => {
  const { container } = render(
    <MemoryRouter>
      <AnimatedBrandMark />
      <AnimatedBrandMark />
    </MemoryRouter>,
  );
  const ids = [...container.querySelectorAll("linearGradient")].map(
    (gradient) => gradient.id,
  );

  expect(new Set(ids).size).toBe(2);
  container.querySelectorAll("g[fill]").forEach((group, index) => {
    expect(group.getAttribute("fill")).toBe(`url(#${ids[index]})`);
  });
});
