import Link from "next/link";
import AdminMovieTable from "@/components/AdminMovieTable";
import { getAllMoviesForAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminMoviesPage() {
  const movies = await getAllMoviesForAdmin();

  return (
    <div className="mt-8">
      <p className="text-sm text-muted">
        <Link href="/admin" className="text-accent hover:underline">
          ← Админ
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-extrabold">Бүх кино ({movies.length})</h1>
      <p className="mt-1 text-sm text-muted">
        Буруу холбогдсон бичлэгийг &ldquo;Дахин холбох&rdquo; эсвэл &ldquo;Тайлах&rdquo; товчоор
        засна. Кино бүхэлдээ буруу бол &ldquo;Кино устгах&rdquo; дарна — холбогдсон бичлэгүүд нь
        таараагүй болж буцна.
      </p>

      <div className="mt-6">
        <AdminMovieTable movies={movies} />
      </div>
    </div>
  );
}
