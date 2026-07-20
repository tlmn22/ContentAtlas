import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChannelVideoRow from "@/components/ChannelVideoRow";
import { getChannelWithVideos } from "@/lib/queries";
import { parseVideoTitle } from "@/lib/title-parser";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminChannelPage({ params }: Props) {
  const { id } = await params;
  const data = await getChannelWithVideos(id);
  if (!data) notFound();

  const { channel, videos } = data;

  return (
    <div className="mt-8">
      <p className="text-sm text-muted">
        <Link href="/admin" className="text-accent hover:underline">
          ← Админ
        </Link>
      </p>

      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-surface ring-1 ring-white/10">
          {channel.avatar_url && (
            <Image src={channel.avatar_url} alt={channel.title} fill sizes="56px" className="object-cover" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">{channel.title}</h1>
          <p className="mt-1 text-sm text-muted">{videos.length} бичлэг, хандалтаар эрэмблэгдсэн</p>
        </div>
      </div>

      {videos.length === 0 ? (
        <p className="py-16 text-center text-muted">Бичлэг олдсонгүй.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {videos.map((v) => {
            const parsed = parseVideoTitle(v.title);
            return (
              <ChannelVideoRow
                key={v.id}
                video={v}
                movie={v.movies}
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
