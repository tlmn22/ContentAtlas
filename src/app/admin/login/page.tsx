import Link from "next/link";
import { login } from "./actions";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="text-xl font-extrabold">Админ нэвтрэх</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
      )}

      <form action={login} className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Нэвтрэх нэр
          <input
            type="text"
            name="username"
            required
            autoFocus
            autoComplete="username"
            className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Нууц үг
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm outline-none focus:border-accent/60"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Нэвтрэх
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/" className="hover:text-accent">
          ← Нүүр хуудас руу буцах
        </Link>
      </p>
    </div>
  );
}
