"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-24 text-center">
      <h1 className="text-xl font-bold">Алдаа гарлаа</h1>
      <p className="mt-3 text-muted">
        Хуудсыг ачаалахад асуудал гарлаа. <code>.env.local</code> дотор Supabase түлхүүрүүд
        тохируулагдсан эсэхийг шалгаад дахин оролдоно уу.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
      >
        Дахин оролдох
      </button>
    </div>
  );
}
