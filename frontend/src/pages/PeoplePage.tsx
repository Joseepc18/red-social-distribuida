import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useRemote } from "../hooks/useRemote";
import { users } from "../services/users";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Icon } from "../components/Icon";
import { StatusMessage } from "../components/StatusMessage";
import { UserCard } from "../components/UserCard";
import { NetworkExplorer } from "../components/NetworkExplorer";
import { copy, homeCopy, peopleCopy, profileCopy } from "../content/copy";
import type { UserSummary } from "../types/api";

type PeopleTab = "friends" | "followers" | "following";
interface PeopleLists {
  readonly friends: UserSummary[];
  readonly followers: UserSummary[];
  readonly following: UserSummary[];
}
interface PeoplePageProps {
  readonly children?: never;
}

export function PeoplePage(_props: PeoplePageProps) {
  const location = useLocation();
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const [tab, setTab] = useState<PeopleTab>("friends");
  const [filter, setFilter] = useState("");
  const loadPeople = useCallback(
    async (signal: AbortSignal): Promise<PeopleLists> => {
      const [followers, following] = await Promise.all([
        users.followers(userId, signal),
        users.following(userId, signal),
      ]);
      const followerIds = new Set(followers.map((user) => user.id));
      return {
        friends: following.filter((user) => followerIds.has(user.id)),
        followers,
        following,
      };
    },
    [userId],
  );
  const people = useRemote("people:" + userId, loadPeople);
  useEffect(() => {
    if (location.hash !== "#sugerencias" || people.loading) return;
    document
      .getElementById("sugerencias")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location, people.loading]);
  const lists: Record<PeopleTab, UserSummary[]> = {
    friends: people.data?.friends ?? [],
    followers: people.data?.followers ?? [],
    following: people.data?.following ?? [],
  };
  const labels: Record<PeopleTab, string> = {
    friends: peopleCopy.title,
    followers: profileCopy.followers,
    following: profileCopy.following,
  };
  const emptyMessages: Record<PeopleTab, string> = {
    friends: peopleCopy.friendsEmpty,
    followers: peopleCopy.followersEmpty,
    following: peopleCopy.followingEmpty,
  };
  const normalizedFilter = filter.trim().replace(/^@/, "").toLocaleLowerCase();
  const visiblePeople = lists[tab].filter((user) =>
    (user.nombre + " " + user.username)
      .toLocaleLowerCase()
      .includes(normalizedFilter),
  );

  return (
    <div className="people-page">
      <header className="people-heading">
        <div>
          <p className="eyebrow">{peopleCopy.eyebrow}</p>
          <h1>{peopleCopy.title}</h1>
        </div>
        <div className="people-heading-actions">
          <Link to="/explorar#sugerencias" className="people-suggestions-link">
            <Icon name="people" />
            <span>{peopleCopy.suggestionsShortcut}</span>
          </Link>
          <div className="people-search" role="search">
            <Input
              label={peopleCopy.filterLabel}
              name="filter"
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={peopleCopy.filterPlaceholder}
            />
            <span className="people-search-icon" aria-hidden="true">
              <Icon name="search" />
            </span>
          </div>
        </div>
      </header>

      <nav
        className="people-tabs"
        role="tablist"
        aria-label={peopleCopy.tabsLabel}
      >
        {(["friends", "followers", "following"] as const).map((item) => (
          <button
            key={item}
            id={"people-tab-" + item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls="people-tabpanel"
            className={
              tab === item ? "people-tab people-tab-active" : "people-tab"
            }
            onClick={() => setTab(item)}
          >
            <span>{labels[item]}</span>
            <span className="people-tab-count">
              {people.data?.[item].length ?? "—"}
            </span>
          </button>
        ))}
      </nav>

      <section
        id="people-tabpanel"
        className="people-connections"
        role="tabpanel"
        aria-labelledby={"people-tab-" + tab}
        aria-busy={people.loading}
      >
        <h2 className="sr-only">{labels[tab]}</h2>
        {people.loading ? (
          <StatusMessage message={copy.loading} />
        ) : people.error ? (
          <StatusMessage message={people.error} error onRetry={people.reload} />
        ) : visiblePeople.length ? (
          <div className="people-grid">
            {visiblePeople.map((user) => (
              <UserCard key={user.id} user={user} compact />
            ))}
          </div>
        ) : (
          <Card className="people-empty">
            <Icon
              name={normalizedFilter ? "search" : "people"}
              className="h-8 w-8"
            />
            <p>
              {normalizedFilter ? peopleCopy.filterEmpty : emptyMessages[tab]}
            </p>
          </Card>
        )}
      </section>

      <section
        id="sugerencias"
        className="people-suggestions"
        aria-label={homeCopy.followTitle}
      >
        <NetworkExplorer onFollow={people.reload} />
      </section>
    </div>
  );
}
