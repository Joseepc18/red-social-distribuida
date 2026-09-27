import { Link } from "react-router";
import { copy } from "../data/mockData";
interface BrandProps {
  readonly compact?: boolean;
}
export function Brand({ compact = false }: BrandProps) {
  return (
    <Link to="/" className="brand" aria-label={copy.brand}>
      <svg
        aria-hidden="true"
        viewBox="0 0 40 40"
        className="h-10 w-10 shrink-0"
        fill="none"
      >
        <path
          d="m10 12 20-6-5 24-18-4 3-14 15 18"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="10" cy="12" r="4" className="brand-node" />
        <circle cx="25" cy="30" r="4" className="brand-node" />
        <circle cx="7" cy="26" r="3" className="brand-node" />
        <circle cx="30" cy="6" r="4" className="brand-accent" />
      </svg>
      <span>
        <strong className="block text-xl tracking-tight">{copy.brand}</strong>
        {!compact && (
          <span className="muted block text-[10px] font-semibold tracking-wider uppercase">
            {copy.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
