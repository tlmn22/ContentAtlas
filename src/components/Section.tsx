import Link from "next/link";
import { ReactNode } from "react";

export default function Section({
  title,
  href,
  count,
  children,
}: {
  title: string;
  href?: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm text-muted transition hover:text-accent">
            Бүгдийг үзэх{typeof count === "number" ? ` (${count})` : ""} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
