import { Link } from "react-router";
import type { UserSummary } from "../types/api";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { profileCopy } from "../data/mockData";
interface UserCardProps {
  readonly user: UserSummary;
  readonly compact?: boolean;
}
export function UserCard({ user, compact = false }: UserCardProps) {
  return (
    <Link
      to={"/usuarios/" + encodeURIComponent(user.id)}
      className={compact ? "user-row" : "user-card"}
    >
      <Avatar name={user.nombre || user.username} large={!compact} />
      <div className="min-w-0 flex-1">
        <h3 className="break-words font-bold">{user.nombre}</h3>
        <p className="muted mt-1 break-all text-sm">@{user.username}</p>
      </div>
      <span className="text-link flex items-center gap-2 text-xs">
        {profileCopy.view}
        <Icon name="arrow" />
      </span>
    </Link>
  );
}
