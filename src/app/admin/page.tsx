import Image from "next/image";
import Link from "next/link";
import { getDb } from "@/lib/supabase";
import { Channel } from "@/lib/types";
import { addChannel, deleteChannel, toggleChannel } from "./actions";
import { logout } from "./login/actions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

export default async function AdminPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const db = getDb();

  const [channelsRes, videoCount, matchedCount, unmatchedCount] = await Promise.all([
    db.from("channels").select("*").order("created_at"),
    db.from("videos").select("*", { count: "exact", head: true }),
    db.from("videos").select("*", { count: "exact", head: true }).not("movie_id", "is", null),
    db.from("videos").select("*", { count: "exact", head: true }).eq("match_status", "unmatched"),
  ]);
  const channels = (channelsRes.data ?? []) as Channel[];

  // Per-channel head-count queries (not a single unfiltered select) so counts
  // stay correct past Supabase's default 1000-row-per-request cap.
  const videoCountByChannel = new Map<string, number>();
  await Promise.all(
    channels.map(async (c) => {
      const { count } = await db
        .from("videos")
        .select("*", { count: "exact", head: true })
        .eq("channel_id", c.id);
      videoCountByChannel.set(c.id, count ?? 0);
    })
  );

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Админ</h1>
        <form action={logout}>
          <button className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-muted transition hover:text-foreground">
            Гарах
          </button>
        </form>
      </div>

      {ok && <p className="mt-4 rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">{ok}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Суваг", value: channels.length },
          { label: "Нийт бичлэг", value: videoCount.count ?? 0 },
          { label: "Таарсан", value: matchedCount.count ?? 0 },
          { label: "Таараагүй", value: unmatchedCount.count ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-surface p-4 ring-1 ring-white/5">
            <p className="text-2xl font-extrabold">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Link href="/admin/unmatched" className="text-sm text-accent hover:underline">
          Таараагүй бичлэгүүдийг холбох →
        </Link>
      </div>

      <h2 className="mt-10 text-lg font-bold">Суваг нэмэх</h2>
      <form action={addChannel} className="mt-3 flex max-w-xl gap-2">
        <input
          type="text"
          name="channel"
          required
          placeholder="@handle, UC... id эсвэл сувгийн URL"
          className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent/60"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Нэмэх
        </button>
      </form>

      <h2 className="mt-10 text-lg font-bold">Сувгууд</h2>
      {channels.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Суваг бүртгэгдээгүй байна.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-muted">
                <th className="py-2 pr-4 font-medium">Суваг</th>
                <th className="py-2 pr-4 font-medium">Бичлэг</th>
                <th className="py-2 pr-4 font-medium">Төлөв</th>
                <th className="py-2 pr-4 font-medium">Сүүлд шалгасан</th>
                <th className="py-2 font-medium">Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface">
                        {c.avatar_url && (
                          <Image src={c.avatar_url} alt={c.title} fill sizes="32px" className="object-cover" />
                        )}
                      </div>
                      <div>
                        <Link href={`/admin/channel/${c.id}`} className="font-medium hover:text-accent">
                          {c.title}
                        </Link>
                        {c.handle && <span className="ml-2 text-xs text-muted">@{c.handle}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted">{videoCountByChannel.get(c.id) ?? 0}</td>
                  <td className="py-3 pr-4">
                    {c.is_active ? (
                      <span className="text-green-400">Идэвхтэй</span>
                    ) : (
                      <span className="text-muted">Идэвхгүй</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-muted">
                    {c.last_checked_at ? new Date(c.last_checked_at).toLocaleString("mn-MN") : "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <form action={toggleChannel.bind(null, c.id, !c.is_active)}>
                        <button className="rounded border border-white/10 px-2 py-1 text-xs text-muted transition hover:text-foreground">
                          {c.is_active ? "Зогсоох" : "Идэвхжүүлэх"}
                        </button>
                      </form>
                      <form action={deleteChannel.bind(null, c.id)}>
                        <button className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10">
                          Устгах
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-xs text-muted">
        Шинэ суваг нэмсний дараа <code>npm run ingest</code> (эсвэл cron) ажиллахад бичлэгүүд татагдана.
        Устгах үйлдэл тухайн сувгийн бүх бичлэгийг хамт устгана.
      </p>
    </div>
  );
}
