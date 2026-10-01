interface IconProps {
  readonly name:
    | "feed"
    | "compass"
    | "people"
    | "chat"
    | "profile"
    | "arrow"
    | "logout"
    | "search"
    | "plus"
    | "heart"
    | "chevron"
    | "settings"
    | "sun"
    | "moon"
    | "image"
    | "back"
    | "send"
    | "expand"
    | "minus";
  readonly className?: string;
  readonly filled?: boolean;
}
const paths = {
  chevron: "M6 9l6 6 6-6",
  settings:
    "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 1v2 M12 21v2 M1 12h2 M21 12h2 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2",
  moon: "M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11z",
  image: "M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M15 7h.01",
  back: "M19 12H5 M11 6l-6 6 6 6",
  send: "M22 2 9 15 M22 2l-7 20-4-9-9-4z",
  expand: "M14 3h7v7 M21 3l-9 9 M10 3H3v18h18v-7",
  minus: "M5 12h14",
  feed: "M8 4h12v12H8z M4 8v12h12 M11 8h6 M11 12h4",
  compass:
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M16.2 7.8l-2.8 6.4-5.6 2 2.8-6.4z",
  people:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M3 20v-2a6 6 0 0 1 12 0v2 M16 5a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 4v2",
  chat: "M4 4h16v12H9l-5 4z M8 8h8 M8 12h5",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21a8 8 0 0 1 16 0",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  logout: "M9 4H4v16h5 M10 12h10 M16 8l4 4-4 4",
  search: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M15 15l6 6",
  plus: "M12 5v14 M5 12h14",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6a5.5 5.5 0 0 0 1-8.8z",
} as const;
export function Icon({ name, className = "", filled = false }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={"h-5 w-5 shrink-0 " + className}
    >
      <path d={paths[name]} fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}
