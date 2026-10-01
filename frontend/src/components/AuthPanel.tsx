import { AnimatedBrandMark } from "./AnimatedBrandMark";

interface AuthPanelProps {
  readonly children?: never;
}

export function AuthPanel(_props: AuthPanelProps) {
  return (
    <aside className="auth-panel" aria-label="ZENIT">
      <AnimatedBrandMark className="w-80 xl:w-[28rem]" />
    </aside>
  );
}
