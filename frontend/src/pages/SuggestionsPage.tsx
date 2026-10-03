import { NetworkExplorer } from "../components/NetworkExplorer";
import { peopleCopy } from "../content/copy";

interface SuggestionsPageProps {
  readonly children?: never;
}

export function SuggestionsPage(_props: SuggestionsPageProps) {
  return (
    <div className="people-page space-y-6">
      <header className="people-heading">
        <div>
          <p className="eyebrow">{peopleCopy.eyebrow}</p>
          <h1>{peopleCopy.suggestionsShortcut}</h1>
        </div>
      </header>
      <NetworkExplorer />
    </div>
  );
}
