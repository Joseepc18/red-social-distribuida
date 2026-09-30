interface AvatarProps {
  readonly name: string;
  readonly large?: boolean;
}
export function Avatar({ name, large = false }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={
        "avatar " + (large ? "h-20 w-20 text-2xl" : "h-10 w-10 text-sm")
      }
    >
      {initials}
    </span>
  );
}
