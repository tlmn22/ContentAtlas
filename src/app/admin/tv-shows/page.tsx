import Link from "next/link";
import AdminTvShowTable from "@/components/AdminTvShowTable";
import { getAllTvShowsForAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminTvShowsPage() {
  const shows = await getAllTvShowsForAdmin();

  return (
    <div className="mt-8">
      <p className="text-sm text-muted">
        <Link href="/admin" className="text-accent hover:underline">
          ← Админ
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-extrabold">Бүх ТВ цуврал ({shows.length})</h1>
      <p className="mt-1 text-sm text-muted">
        Буруу холбогдсон бичлэгийг &ldquo;Дахин холбох&rdquo; эсвэл &ldquo;Тайлах&rdquo; товчоор
        засна. Цуврал бүхэлдээ буруу бол &ldquo;Цуврал устгах&rdquo; дарна — холбогдсон бичлэгүүд нь
        таараагүй болж буцна.
      </p>

      <div className="mt-6">
        <AdminTvShowTable shows={shows} />
      </div>
    </div>
  );
}
