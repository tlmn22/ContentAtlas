import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getActiveChannels } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Сувгууд",
  description: "Кино тайлбар хийдэг Монгол YouTube сувгууд.",
};

export default async function ChannelsPage() {
  const channels = await getActiveChannels();

  return (
    <div className="mt-8">
      <h1 className="text-2xl font-extrabold">Сувгууд</h1>
      <p className="mt-1 text-sm text-muted">Бидний бүртгэсэн кино тайлбар сувгууд.</p>

      {channels.length === 0 ? (
        <p className="py-16 text-center text-muted">Одоогоор бүртгэлтэй суваг алга.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((c) => (
            <Link
              key={c.id}
              href={`/suvag/${c.id}`}
              className="flex items-center gap-4 rounded-xl bg-surface p-4 ring-1 ring-white/5 transition hover:ring-accent/60"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-background">
                {c.avatar_url && (
                  <Image src={c.avatar_url} alt={c.title} fill sizes="56px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.title}</p>
                {c.handle && <p className="truncate text-sm text-muted">@{c.handle}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
