import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SwRegister from "@/components/SwRegister";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Кино Сан — Кино тайлбарын нэгдсэн сан",
    template: "%s | Кино Сан",
  },
  description:
    "Монгол хэл дээрх кино тайлбар бичлэгүүдийг нэг дороос. Жанр, он, нэрээр хайж дуртай киногоо олоорой.",
  openGraph: {
    type: "website",
    locale: "mn_MN",
    siteName: "Кино Сан",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0e14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body className={`${inter.variable} antialiased`}>
        <SwRegister />
        <header className="sticky top-0 z-40 border-b border-white/5 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <Link href="/" className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight">
              <span className="rounded bg-accent px-1.5 py-0.5 text-sm text-black">КИНО</span>
              <span className="text-lg">САН</span>
            </Link>
            <div className="flex-1" />
            <SearchBar />
            <nav className="hidden shrink-0 gap-4 text-sm text-muted sm:flex">
              <Link href="/hailt" className="transition hover:text-accent">
                Хайлт
              </Link>
              <Link href="/suvag" className="transition hover:text-accent">
                Сувгууд
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 pb-16">{children}</main>
        <footer className="border-t border-white/5 py-8 text-center text-xs text-muted">
          <p>
            Бүх бичлэг YouTube дээрх эх сувгаасаа шууд тоглоно. Контентын эрх нь тухайн сувгийн
            эзэнд хамаарна.
          </p>
          <p className="mt-2">Кино мэдээлэл: TMDB · © {new Date().getFullYear()} Кино Сан</p>
        </footer>
      </body>
    </html>
  );
}
