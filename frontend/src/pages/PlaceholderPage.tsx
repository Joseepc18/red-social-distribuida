import { Link } from "react-router";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { copy } from "../content/copy";
interface PlaceholderPageProps {
  readonly title: string;
  readonly description: string;
}
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{copy.member}</p>
        <h1>{title}</h1>
        <p className="muted mt-3">{description}</p>
      </div>
      <Card className="empty-panel">
        <span className="avatar h-16 w-16">
          <Icon name="people" className="h-8 w-8" />
        </span>
        <h2>{copy.soon}</h2>
        <p className="muted max-w-md">{copy.waiting}</p>
        <Link to="/explorar" className="button button-primary">
          {copy.explore}
          <Icon name="arrow" />
        </Link>
      </Card>
    </div>
  );
}
