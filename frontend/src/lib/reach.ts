import { socialCopy } from "../content/social-copy";
import type { ReachableUser } from "../types/social";

export interface ReachGroup {
  readonly distance: number;
  readonly users: readonly ReachableUser[];
}

/** Groups the reach list by distance, nearest first, keeping the server order inside each group. */
export function groupByDistance(users: readonly ReachableUser[]): ReachGroup[] {
  const groups = new Map<number, ReachableUser[]>();
  for (const user of users)
    groups.set(user.distancia, [...(groups.get(user.distancia) ?? []), user]);
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([distance, members]) => ({ distance, users: members }));
}

/** "Tú → @carla → @diego": who the user reaches and through whom. */
export function connectionChain(user: ReachableUser): string {
  return [
    socialCopy.you,
    ...user.via.map((username) => "@" + username),
    "@" + user.username,
  ].join(" → ");
}
