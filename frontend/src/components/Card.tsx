import type { HTMLAttributes } from "react";
interface CardProps extends Readonly<HTMLAttributes<HTMLElement>> {
  readonly className?: string;
}
export function Card({ className = "", ...props }: CardProps) {
  return <section className={"card " + className} {...props} />;
}
