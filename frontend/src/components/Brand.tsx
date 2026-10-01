import { Link } from "react-router";
import { copy } from "../content/copy";
interface BrandProps {
  readonly compact?: boolean;
  readonly showTagline?: boolean;
}
export function Brand({ compact = false, showTagline = true }: BrandProps) {
  return (
    <Link
      to="/"
      className={"brand " + (compact ? "brand-compact" : "brand-full")}
      aria-label={copy.brand}
    >
      <span className={"brand-symbol-frame " + (compact ? "compact" : "full")}>
        <img
          src="/images/zenit-brand.png"
          alt=""
          aria-hidden="true"
          className={"brand-symbol-image " + (compact ? "compact" : "full")}
        />
      </span>
      <strong className={"brand-wordmark " + (compact ? "compact" : "full")}>
        {copy.brand}
      </strong>
      {!compact && showTagline && (
        <span className="brand-tagline">{copy.tagline}</span>
      )}
    </Link>
  );
}
