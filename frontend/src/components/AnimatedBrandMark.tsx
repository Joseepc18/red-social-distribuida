import { useEffect, useId, useRef } from "react";
import { Link } from "react-router";
import { copy } from "../content/copy";
import "../styles/brand-mark.css";

interface AnimatedBrandMarkProps {
  /** Sizes the logo from the outside (for example w-48); the SVG fills that width. */
  readonly className?: string;
}

interface Point {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

interface Orbit {
  readonly ax: number;
  readonly ay: number;
  readonly sx: number;
  readonly sy: number;
  readonly p: number;
}

type NodeName = "tl" | "tr" | "mid" | "bl" | "br";

// Geometry traced from the PNG logo, in viewBox units.
const NODES: Readonly<Record<NodeName, Point>> = {
  tl: { x: 172, y: 155, r: 11 },
  tr: { x: 260, y: 133, r: 19 },
  mid: { x: 208, y: 195, r: 12.5 },
  bl: { x: 165, y: 255, r: 16 },
  br: { x: 252, y: 233, r: 13 },
};
const NODE_NAMES = Object.keys(NODES) as NodeName[];
const LINKS: readonly (readonly [NodeName, NodeName])[] = [
  ["tl", "tr"],
  ["tr", "mid"],
  ["mid", "bl"],
  ["bl", "br"],
];
const ORBITS: Readonly<Record<NodeName, Orbit>> = {
  tl: { ax: 2, ay: 3.5, sx: 0.9, sy: 1.1, p: 0 },
  tr: { ax: 2.5, ay: 4, sx: 0.7, sy: 0.85, p: 1.7 },
  mid: { ax: 2, ay: 3, sx: 1.05, sy: 0.95, p: 3.1 },
  bl: { ax: 2.5, ay: 3.5, sx: 0.8, sy: 1.0, p: 4.4 },
  br: { ax: 2, ay: 3.5, sx: 0.95, sy: 0.75, p: 2.3 },
};
// Loose dots float with CSS only (see brand-mark.css).
const DOTS = [
  { name: "dot-a", x: 181, y: 122, r: 5 },
  { name: "dot-b", x: 141, y: 208, r: 7 },
  { name: "dot-c", x: 274, y: 198, r: 10 },
  { name: "dot-d", x: 234, y: 262, r: 8 },
] as const;
const GRADIENT_STOPS = [
  ["0", "orange-3"],
  ["0.16", "orange-2"],
  ["0.32", "orange"],
  ["0.55", "mauve"],
  ["1", "plum"],
] as const;

// Link shape: as wide as half of each node, narrowing to a neck in the middle.
function linkPath(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const wa = a.r * 0.5;
  const wb = b.r * 0.5;
  const neck = Math.min(a.r, b.r) * 0.17;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return (
    `M${a.x + nx * wa},${a.y + ny * wa} Q${mx + nx * neck},${my + ny * neck} ${b.x + nx * wb},${b.y + ny * wb}` +
    ` L${b.x - nx * wb},${b.y - ny * wb} Q${mx - nx * neck},${my - ny * neck} ${a.x - nx * wa},${a.y - ny * wa} Z`
  );
}

function orbitAt(name: NodeName, seconds: number): Point {
  const { x, y, r } = NODES[name];
  const { ax, ay, sx, sy, p } = ORBITS[name];
  return {
    x: x + Math.sin(seconds * sx + p) * ax,
    y: y + Math.cos(seconds * sy + p) * ay,
    r,
  };
}

export function AnimatedBrandMark({ className = "" }: AnimatedBrandMarkProps) {
  // Desktop and mobile render this at the same time: ids must be unique per instance.
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodeRefs = useRef<Partial<Record<NodeName, SVGCircleElement | null>>>(
    {},
  );
  const linkRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame: number | null = null;
    let visible = typeof IntersectionObserver === "undefined";
    let disposed = false;

    // Moves the SVG attributes directly: no React state, so nothing re-renders per frame.
    function tick(now: number) {
      frame = null;
      if (!visible || document.hidden || disposed) return;
      const seconds = now / 1000;
      const points = {} as Record<NodeName, Point>;
      for (const name of NODE_NAMES) {
        const point = orbitAt(name, seconds);
        points[name] = point;
        nodeRefs.current[name]?.setAttribute("cx", point.x.toFixed(2));
        nodeRefs.current[name]?.setAttribute("cy", point.y.toFixed(2));
      }
      LINKS.forEach(([from, to], index) =>
        linkRefs.current[index]?.setAttribute(
          "d",
          linkPath(points[from], points[to]),
        ),
      );
      schedule();
    }

    function schedule() {
      if (frame === null && visible && !document.hidden && !disposed) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    function stop() {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    }

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = Boolean(
              entry?.isIntersecting && entry.intersectionRatio > 0,
            );
            if (visible) schedule();
            else stop();
          });
    if (observer && svgRef.current) observer.observe(svgRef.current);

    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else schedule();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule();

    return () => {
      disposed = true;
      observer?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stop();
    };
  }, []);

  return (
    <Link
      to="/"
      className={("brand brand-mark " + className).trim()}
      aria-label={copy.brand}
    >
      <svg
        ref={svgRef}
        className="brand-mark-svg"
        viewBox="120 100 180 220"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="276"
            y1="120"
            x2="150"
            y2="268"
          >
            {GRADIENT_STOPS.map(([offset, color]) => (
              <stop
                key={offset}
                offset={offset}
                className={"brand-mark-stop-" + color}
              />
            ))}
          </linearGradient>
        </defs>
        <g fill={`url(#${gradientId})`}>
          {LINKS.map(([from, to], index) => (
            <path
              key={from + "-" + to}
              ref={(element) => {
                linkRefs.current[index] = element;
              }}
              className="brand-mark-link"
              d={linkPath(NODES[from], NODES[to])}
            />
          ))}
          {NODE_NAMES.map((name) => (
            <circle
              key={name}
              ref={(element) => {
                nodeRefs.current[name] = element;
              }}
              className="brand-mark-node"
              cx={NODES[name].x}
              cy={NODES[name].y}
              r={NODES[name].r}
            />
          ))}
        </g>
        {DOTS.map((dot) => (
          <circle
            key={dot.name}
            className={"brand-mark-dot brand-mark-" + dot.name}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
          />
        ))}
        <text
          className="brand-mark-wordmark"
          x="210"
          y="306"
          textAnchor="middle"
        >
          {copy.brand}
        </text>
      </svg>
    </Link>
  );
}
