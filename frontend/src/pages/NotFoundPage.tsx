import { Link } from "react-router";
import { copy } from "../content/copy";
interface NotFoundPageProps {
  readonly children?: never;
}
export function NotFoundPage(_props: NotFoundPageProps) {
  return (
    <div className="empty-panel">
      <h1>{copy.notFound}</h1>
      <p className="muted">{copy.notFoundBody}</p>
      <Link to="/" className="button button-primary">
        {copy.back}
      </Link>
    </div>
  );
}
