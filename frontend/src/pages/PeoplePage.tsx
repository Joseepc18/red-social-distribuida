import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useRemote } from "../hooks/useRemote";
import { users } from "../services/users";
import { usePeopleSearch } from "../hooks/usePeopleSearch";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
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
  const search = usePeopleSearch();
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const [tab, setTab] = useState<PeopleTab>("friends");
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
  const results = search.data ?? [];

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
          <form
            onSubmit={search.submit}
            className="people-search"
            role="search"
          >
            <Input
              key={search.query}
              label={copy.search}
              name="q"
              type="search"
              defaultValue={search.query}
              placeholder={peopleCopy.placeholder}
            />
            <Button type="submit" aria-label={peopleCopy.search}>
              <Icon name="search" />
            </Button>
          </form>
        </div>
      </header>

      {search.query ? (
        <section
          className="people-search-results"
          aria-live="polite"
          aria-busy={search.loading}
        >
          <div className="people-results-heading">
            <h2>{peopleCopy.results}</h2>
            {search.data && (
              <span className="muted text-sm">
                {results.length}{" "}
                {results.length === 1 ? peopleCopy.person : peopleCopy.people}
              </span>
            )}
          </div>
          {search.loading ? (
            <StatusMessage message={copy.loading} />
          ) : search.error ? (
            <StatusMessage
              message={search.error}
              error
              onRetry={search.reload}
            />
          ) : results.length ? (
            <div className="people-grid">
              {results.map((user) => (
                <UserCard key={user.id} user={user} compact />
              ))}
            </div>
          ) : (
            <Card className="people-empty">
              <Icon name="search" className="h-8 w-8" />
              <h2>{peopleCopy.emptyTitle}</h2>
              <p className="muted">{peopleCopy.emptyBody}</p>
            </Card>
          )}
        </section>
      ) : (
        <>
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
              <StatusMessage
                message={people.error}
                error
                onRetry={people.reload}
              />
            ) : lists[tab].length ? (
              <div className="people-grid">
                {lists[tab].map((user) => (
                  <UserCard key={user.id} user={user} compact />
                ))}
              </div>
            ) : (
              <Card className="people-empty">
                <Icon name="people" className="h-8 w-8" />
                <p>{emptyMessages[tab]}</p>
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
        </>
      )}
    </div>
  );
}
