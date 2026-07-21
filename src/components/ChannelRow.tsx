import Image from "next/image";
import Link from "next/link";
import { Channel } from "@/lib/types";

/** Horizontally scrollable row of registered channels (avatar + name). */
export default function ChannelRow({ channels }: { channels: Channel[] }) {
  return (
    <div className="scroll-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
      {channels.map((c) => (
        <Link
          key={c.id}
          href={`/suvag/${c.id}`}
          className="group flex w-20 shrink-0 flex-col items-center gap-1.5 text-center"
          title={c.title}
        >
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-surface ring-1 ring-white/10 transition group-hover:ring-accent/60">
            {c.avatar_url && (
              <Image src={c.avatar_url} alt={c.title} fill sizes="64px" className="object-cover" />
            )}
          </span>
          <span className="line-clamp-2 text-xs text-muted group-hover:text-accent">{c.title}</span>
        </Link>
      ))}
    </div>
  );
}
