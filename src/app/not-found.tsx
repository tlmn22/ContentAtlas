import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-32 text-center">
      <p className="text-6xl font-extrabold text-accent">404</p>
      <h1 className="mt-4 text-xl font-bold">Хуудас олдсонгүй</h1>
      <p className="mt-2 text-muted">Таны хайсан хуудас байхгүй эсвэл устгагдсан байна.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
      >
        Нүүр хуудас руу буцах
      </Link>
    </div>
  );
}
