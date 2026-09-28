import type { Suggestion } from "../types/social";
import { Card } from "./Card";
import { UserCard } from "./UserCard";
import { Button } from "./Button";
import { socialCopy } from "../content/social-copy";
import { copy, profileCopy } from "../content/copy";
interface SuggestionCardProps {
  readonly user: Suggestion;
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly onFollow: (user: Suggestion) => void;
}
export function SuggestionCard({
  user,
  busy,
  disabled,
  onFollow,
}: SuggestionCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      <UserCard user={user} compact />
      <p className="muted flex-1 text-sm leading-relaxed">
        {socialCopy.suggestionReason(user)}
      </p>
      <Button
        disabled={disabled}
        onClick={() => onFollow(user)}
        aria-label={profileCopy.follow + " a " + user.nombre}
      >
        {busy ? copy.loading : profileCopy.follow}
      </Button>
    </Card>
  );
}
