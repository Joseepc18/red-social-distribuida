import { usePeopleSearch } from "../hooks/usePeopleSearch";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { StatusMessage } from "../components/StatusMessage";
import { UserCard } from "../components/UserCard";
import { copy, peopleCopy } from "../content/copy";
interface PeoplePageProps {
  readonly children?: never;
}
export function PeoplePage(_props: PeoplePageProps) {
  const search = usePeopleSearch();
  return (
    <div className="space-y-8">
      <Card className="explore-header">
        <p className="eyebrow">{peopleCopy.eyebrow}</p>
        <h1>{peopleCopy.title}</h1>
        <p className="muted mt-3 max-w-2xl leading-relaxed">
          {peopleCopy.intro}
        </p>
        <form
          onSubmit={search.submit}
          className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end"
          role="search"
        >
          <div className="flex-1">
            <Input
              key={search.query}
              label={copy.search}
              name="q"
              type="search"
              defaultValue={search.query}
              placeholder={peopleCopy.placeholder}
            />
          </div>
          <Button type="submit">
            <Icon name="search" />
            {peopleCopy.search}
          </Button>
        </form>
      </Card>
      <section aria-live="polite" aria-busy={search.loading}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2>{search.query ? peopleCopy.results : peopleCopy.community}</h2>
          {search.data && (
            <span className="muted text-sm">
              {search.data.length}{" "}
              {search.data.length === 1 ? peopleCopy.person : peopleCopy.people}
            </span>
          )}
        </div>
        {search.loading ? (
          <StatusMessage message={copy.loading} />
        ) : search.error ? (
          <StatusMessage message={search.error} error onRetry={search.reload} />
        ) : search.data?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {search.data.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        ) : (
          <Card className="empty-panel">
            <Icon name="search" className="h-10 w-10" />
            <h2>{peopleCopy.emptyTitle}</h2>
            <p className="muted">{peopleCopy.emptyBody}</p>
          </Card>
        )}
      </section>
    </div>
  );
}
