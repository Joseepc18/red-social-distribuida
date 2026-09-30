import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { homeCopy } from "../content/copy";
import { PostComposer } from "../components/PostComposer";
import { PostList } from "../components/PostList";
import { DiscoverList } from "../components/DiscoverList";
import { WhoToFollow } from "../components/WhoToFollow";
interface FeedPageProps {
  readonly children?: never;
}
export function FeedPage(_props: FeedPageProps) {
  const { session } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const forYou = params.get("vista") === "para-ti";
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (location.hash === "#nueva-publicacion")
      document.getElementById("post-text")?.focus();
  }, [location]);
  return (
    <div className="home-grid">
      <section className="home-timeline" aria-label="Inicio">
        <h1 className="sr-only">Inicio</h1>
        <PostComposer key={session?.token} />
        <button type="button" className="timeline-refresh" onClick={refresh}>
          {forYou ? homeCopy.refreshForYou : homeCopy.refreshFeed}
        </button>
        {forYou ? (
          <DiscoverList key={session?.token + ":" + version} />
        ) : (
          <div className="timeline-posts">
            <PostList key={session?.token + ":" + version} path="/feed" feed />
          </div>
        )}
      </section>
      <WhoToFollow onFollow={refresh} />
    </div>
  );
}
