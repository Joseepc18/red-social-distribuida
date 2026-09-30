import { Link } from "react-router";
import { Brand } from "./Brand";
import { authCopy, copy } from "../content/copy";
interface AuthPanelProps {
  readonly children?: never;
}
export function AuthPanel(_props: AuthPanelProps) {
  return (
    <aside className="auth-panel">
      <Brand />
      <div className="space-y-6">
        <p className="eyebrow">{authCopy.eyebrow}</p>
        <h1 className="max-w-md text-4xl xl:text-5xl">{copy.community}</h1>
        <p className="muted max-w-sm text-base leading-relaxed">{copy.intro}</p>
        <div className="auth-photo">
          <img
            src={authCopy.image}
            alt={authCopy.imageAlt}
            className="h-full w-full object-cover"
          />
          <div className="auth-photo-caption">
            <span>{authCopy.photoCaption}</span>
            <span className="text-xs">{authCopy.photoDetail}</span>
          </div>
        </div>
      </div>
      <Link to="/login" className="muted text-xs">
        {authCopy.footer}
      </Link>
    </aside>
  );
}
