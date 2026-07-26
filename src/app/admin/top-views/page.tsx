import Image from "next/image";
import Link from "next/link";
import { formatViews } from "@/lib/format";
import { getMoviesRankedByViews } from "@/lib/queries";
import { posterUrl } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function AdminTopViewsPage() {
  const movies = await getMoviesRankedByViews();

  return (
    <div className="mt-8">
      <p className="text-sm text-muted">
        <Link href="/admin" className="text-accent hover:underline">
          ← Админ
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-extrabold">Бүх кино — хамгийн их үзэлттэйгээр ({movies.length})</h1>
      <p className="mt-1 text-sm text-muted">
        Сувгаас үл хамааран бүх кино нэг жагсаалтад, тухайн киног хамгийн олон үзэлттэй ярьсан ганц
        бичлэгийн үзэлтээр эрэмблэгдсэн.
      </p>

      {movies.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Одоогоор таарсан кино алга байна.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-muted">
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">Кино</th>
                <th className="py-2 pr-4 font-medium">Хамгийн их үзэлттэй суваг</th>
                <th className="py-2 font-medium">Үзэлт</th>
              </tr>
            </thead>
            <tbody>
              {movies.map((m, i) => (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-muted">{i + 1}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-surface">
                        {posterUrl(m.poster_path) && (
                          <Image
                            src={posterUrl(m.poster_path)!}
                            alt={m.title}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <Link href={`/kino/${m.slug}`} target="_blank" className="min-w-0 hover:text-accent">
                        <p className="truncate font-medium">
                          {m.title_mn ?? m.title} <span className="text-muted">({m.year ?? "?"})</span>
                        </p>
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-surface">
                        {m.topChannel.avatar_url && (
                          <Image
                            src={m.topChannel.avatar_url}
                            alt={m.topChannel.title}
                            fill
                            sizes="24px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="text-muted">{m.topChannel.title}</span>
                    </div>
                  </td>
                  <td className="py-3 font-semibold text-accent">{formatViews(m.topViews)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
