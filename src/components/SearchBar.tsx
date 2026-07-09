"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function SearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/hailt?q=${encodeURIComponent(query)}` : "/hailt");
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Кино хайх..."
        className="w-full rounded-l-full border border-white/10 bg-surface px-4 py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent/60"
      />
      <button
        type="submit"
        aria-label="Хайх"
        className="rounded-r-full border border-l-0 border-white/10 bg-surface px-4 text-muted transition hover:text-accent"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    </form>
  );
}

export default function SearchBar() {
  return (
    <Suspense fallback={<div className="h-9 w-full max-w-md" />}>
      <SearchForm />
    </Suspense>
  );
}
