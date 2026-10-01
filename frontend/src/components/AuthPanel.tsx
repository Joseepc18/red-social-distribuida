import { Brand } from "./Brand";

interface AuthPanelProps {
  readonly children?: never;
}

export function AuthPanel(_props: AuthPanelProps) {
  return (
    <aside className="auth-panel" aria-label="ZENIT">
      <Brand showTagline={false} />
    </aside>
  );
}
