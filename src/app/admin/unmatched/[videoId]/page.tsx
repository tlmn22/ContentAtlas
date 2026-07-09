import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/supabase";
import { parseVideoTitle } from "@/lib/title-parser";
import { posterUrl, releaseYear, searchMovie, TmdbMovie } from "@/lib/tmdb";
import { VideoWithChannel } from "@/lib/types";
import { ignoreVideo, linkVideo } from "../../actions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ q?: string; error?: string }>;
}

export default async function MatchVideoPage({ params, searchParams }: Props) {
  const { videoId } = await params;
  const { q, error } = await searchParams;

  const db = getDb();
  const { data } = await db
    .from("videos")
    .select("*, channels(id, title, avatar_url)")
    .eq("id", videoId)
    .maybeSingle();
  if (!data) notFound();
  const video = data as unknown as VideoWithChannel;

  const parsed = parseVideoTitle(video.title);
  const query = q?.trim() || parsed.queries[0] || "";
  let results: TmdbMovie[] = [];
  if (query) {
    results = await searchMovie(query, q ? undefined : parsed.year ?? undefined);
    if (results.length === 0 && !q) results = await searchMovie(query);
  }

  return (
    <div className="mt-8">
      <p className="text-sm text-muted">
        <Link href="/admin/unmatched" className="text-accent hover:underline">
          ← Таараагүй бичлэгүүд
        </Link>
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex items-start gap-4">
        <div className="relative aspect-video w-48 shrink-0 overflow-hidden rounded bg-surface">
          {video.thumbnail_url && (
            <Image src={video.thumbnail_url} alt={video.title} fill sizes="192px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-snug">{video.title}</h1>
          <p className="mt-1 text-sm text-muted">{video.channels.title}</p>
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-accent hover:underline"
          >
            YouTube дээр шалгах ↗
          </a>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="TMDB-ээс хайх (англи нэр дээр сайн ажиллана)"
            className="w-72 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent/60"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Хайх
          </button>
        </form>
        <form action={ignoreVideo.bind(null, video.id)}>
          <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted transition hover:text-foreground">
            Кино биш — нуух
          </button>
        </form>
      </div>

      {results.length === 0 ? (
        <p className="py-12 text-center text-muted">
          {query ? "TMDB-ээс илэрц олдсонгүй. Өөр нэрээр хайж үзнэ үү." : "Хайх үг оруулна уу."}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {results.slice(0, 10).map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-4 rounded-lg p-3 ring-1 ring-white/5"
            >
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded bg-surface">
                {posterUrl(m.poster_path) && (
                  <Image
                    src={posterUrl(m.poster_path)!}
                    alt={m.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {m.title}{" "}
                  <span className="font-normal text-muted">
                    {releaseYear(m) ?? "?"} · ★ {m.vote_average?.toFixed(1) ?? "-"}
                  </span>
                </p>
                {m.original_title !== m.title && (
                  <p className="text-sm text-muted">{m.original_title}</p>
                )}
                <p className="mt-1 line-clamp-2 text-xs text-muted">{m.overview}</p>
              </div>
              <form action={linkVideo.bind(null, video.id, m.id, parsed.titleMn)}>
                <button className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110">
                  Холбох
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
