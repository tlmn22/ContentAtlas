import { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import MovieGrid from "@/components/MovieGrid";
import { getChannelMovies, getChannelWithVideos } from "@/lib/queries";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getChannelWithVideos(id).catch(() => null);
  if (!data) return { title: "Суваг олдсонгүй" };
  return {
    title: data.channel.title,
    description: `${data.channel.title} сувгийн кино тайлбарласан кинонууд.`,
  };
}

export default async function ChannelPage({ params }: Props) {
  const { id } = await params;
  const [channelData, movies] = await Promise.all([getChannelWithVideos(id), getChannelMovies(id)]);
  if (!channelData) notFound();

  const { channel } = channelData;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface ring-1 ring-white/10">
          {channel.avatar_url && (
            <Image src={channel.avatar_url} alt={channel.title} fill sizes="80px" className="object-cover" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">{channel.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {channel.handle ? `@${channel.handle} · ` : ""}
            {movies.length} кино
            {" · "}
            <a
              href={`https://www.youtube.com/channel/${channel.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              YouTube дээр үзэх
            </a>
          </p>
        </div>
      </div>

      <div className="mt-8">
        <MovieGrid movies={movies} />
      </div>
    </div>
  );
}
