import Link from "next/link";
import UnmatchedRow from "@/components/UnmatchedRow";
import { getDb } from "@/lib/supabase";
import { parseVideoTitle } from "@/lib/title-parser";
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
    .order("view_count", { ascending: false, nullsFirst: false })
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
        Автомат тааруулалт бүтээгүй бичлэгүүд, хандалтаар эрэмблэгдсэн. &ldquo;Холбох&rdquo; дарж,
        тухайн мөр дотроос шууд TMDB хайж холбоно.
      </p>

      {ok && <p className="mt-4 rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">{ok}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

      {videos.length === 0 ? (
        <p className="py-16 text-center text-muted">Таараагүй бичлэг алга. 🎉</p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {videos.map((v) => {
            const parsed = parseVideoTitle(v.title);
            return (
              <UnmatchedRow
                key={v.id}
                video={v}
                initialQuery={parsed.queries[0] ?? ""}
                initialYear={parsed.year}
                initialTitleMn={parsed.titleMn}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
