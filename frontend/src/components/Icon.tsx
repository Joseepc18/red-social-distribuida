interface IconProps {
  readonly name:
    | "feed"
    | "people"
    | "chat"
    | "profile"
    | "arrow"
    | "logout"
    | "search"
    | "plus";
  readonly className?: string;
}
const paths = {
  feed: "M8 4h12v12H8z M4 8v12h12 M11 8h6 M11 12h4",
  people:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M3 20v-2a6 6 0 0 1 12 0v2 M16 5a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 4v2",
  chat: "M4 4h16v12H9l-5 4z M8 8h8 M8 12h5",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21a8 8 0 0 1 16 0",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  logout: "M9 4H4v16h5 M10 12h10 M16 8l4 4-4 4",
  search: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M15 15l6 6",
  plus: "M12 5v14 M5 12h14",
} as const;
export function Icon({ name, className = "" }: IconProps) {
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
      <path d={paths[name]} />
    </svg>
  );
}
