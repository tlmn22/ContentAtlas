import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { getDb } from "@/lib/supabase";
import { VideoWithChannel } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

export default async function UnmatchedPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const db = getDb();

  const { data } = await db
    .from("videos")
    .select("*, channels(id, title, avatar_url)")
    .eq("match_status", "unmatched")
    .eq("is_available", true)
    .order("published_at", { ascending: false })
    .limit(100);
  const videos = (data ?? []) as unknown as VideoWithChannel[];

  return (
    <div className="mt-8">
      <p className="text-sm text-muted">
        <Link href="/admin" className="text-accent hover:underline">
          ← Админ
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-extrabold">Таараагүй бичлэгүүд</h1>
      <p className="mt-1 text-sm text-muted">
        Автомат тааруулалт бүтээгүй бичлэгүүд. Мөр дээр дарж гараар холбоно уу.
      </p>

      {ok && <p className="mt-4 rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">{ok}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

      {videos.length === 0 ? (
        <p className="py-16 text-center text-muted">Таараагүй бичлэг алга. 🎉</p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {videos.map((v) => (
            <Link
              key={v.id}
              href={`/admin/unmatched/${v.id}`}
              className="flex items-center gap-4 rounded-lg p-2 ring-1 ring-white/5 transition hover:bg-surface hover:ring-white/10"
            >
              <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded bg-surface">
                {v.thumbnail_url && (
                  <Image src={v.thumbnail_url} alt={v.title} fill sizes="128px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {v.channels.title} · {formatDate(v.published_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
