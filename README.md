# Kino Hub — Кино Recap Aggregator

Монголын YouTube дээрх кино тайлбар (recap) сувгуудын бичлэгүүдийг нэг дор цуглуулж, кино сайт шиг цэгцтэй үзүүлдэг платформ. Бичлэгүүд YouTube embed-ээр тоглоно — видео хостинг хийхгүй.

## Стек

- **Next.js** (App Router, TypeScript, SSR) + **Tailwind CSS**
- **Supabase** (PostgreSQL)
- **YouTube Data API v3** (quota хэмнэлттэй `playlistItems` endpoint)
- **TMDB API** (кино метадата)
- **Vercel** хостинг + **GitHub Actions** cron

## Анх удаа тохируулах

### 1. Орчны хувьсагчид

```bash
cp .env.example .env.local
```

Дараах түлхүүрүүдийг бөглөнө:

| Хувьсагч | Хаанаас авах |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `YOUTUBE_API_KEY` | Google Cloud Console → YouTube Data API v3 идэвхжүүлж API key үүсгэх |
| `TMDB_API_TOKEN` | themoviedb.org → Settings → API → **API Read Access Token** (v4) |
| `CRON_SECRET` | Санамсаргүй урт тэмдэгт мөр (`openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | `/admin` хуудасны нууц үг (хэрэглэгчийн нэр: `admin`) |
| `NEXT_PUBLIC_SITE_URL` | Deploy хийсэн домэйн (SEO/sitemap-д хэрэглэнэ) |

### 2. Өгөгдлийн сангийн schema

Supabase Dashboard → SQL Editor дээр [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) файлын агуулгыг бүхэлд нь ажиллуулна. (Эсвэл Supabase CLI: `supabase db push`.)

### 3. Ажиллуулах

```bash
npm install
npm run dev
```

### 4. Суваг нэмээд контент татах

1. `http://localhost:3000/admin` руу орж (нэвтрэх нэр: `admin`, нууц үг: `ADMIN_PASSWORD`) суваг нэмнэ. `@handle`, `UC...` id, эсвэл сувгийн URL аль нь ч болно.
2. Ingestion worker ажиллуулна:

```bash
npm run ingest              # бүх идэвхтэй сувгийг sync хийнэ
npm run ingest -- UCxxxxxx  # нэг сувгийг sync хийнэ
```

Анхны sync нь сувгийн бүх бичлэгийг татаж, гарчгаас нь кино нэр/оныг ялгаад TMDB-ээс автоматаар тааруулна. Таараагүй бичлэгүүдийг `/admin/unmatched` дээр гараар холбоно.

## Архитектур

```
src/
  lib/
    youtube.ts        YouTube Data API (playlistItems=1 unit, search хэрэглэдэггүй)
    tmdb.ts           TMDB хайлт + метадата
    title-parser.ts   Бичлэгийн гарчгаас кино нэр/он ялгах heuristic
    matcher.ts        TMDB тааруулалт + оноожуулалт (threshold=4), movie upsert
    ingest.ts         Sync логик: шинэ бичлэг, availability sweep
    queries.ts        Хуудсуудын өгөгдөл татах функцууд
  app/
    page.tsx              Нүүр (шинэ, их үзэлттэй, жанрын мөрүүд)
    kino/[slug]/          Кино хуудас (embed тоглуулагч, SEO meta, JSON-LD)
    suvag/, suvag/[id]/   Сувгийн жагсаалт ба хуудас
    hailt/                Хайлт (нэр, жанр, он)
    admin/                Суваг удирдах, таараагүй бичлэг холбох
    api/cron/ingest/      Cron endpoint (Bearer CRON_SECRET)
scripts/ingest.ts     CLI worker (npm run ingest)
supabase/migrations/  Schema
```

### Өгөгдлийн загвар

`channels` → `videos` (N:1) → `movies` (N:1, nullable) → `movie_genres` → `genres`. Нэг кино олон сувгийн олон recap бичлэгтэй байж болно. Ирээдүйд кино бус контент нэмэхэд зориулж `categories` / `video_categories` хүснэгтүүд бэлэн.

### Тааруулалтын урсгал

1. Гарчгийг цэвэрлэнэ (кино тайлбар, recap, emoji, hashtag г.м. хог үгсийг хасна)
2. Латин үсэгтэй хэсэг, «хашилтад» бичсэн нэр, он (жишээ нь `(2019)`) -ыг ялгана
3. TMDB-ээс хайж, нэрийн ижилслэл + оны тохирол + нэр хүндээр оноожуулна
4. Оноо хангалттай бол `auto` статустай холбоно, үгүй бол `unmatched` үлдээж admin гараар холбоно

## Deploy (Vercel)

1. GitHub repo үүсгэж push хийнэ, Vercel дээр import хийнэ
2. Environment Variables хэсэгт `.env.local`-ын бүх утгыг оруулна
3. `vercel.json` доторх cron өдөрт 1 удаа ажиллана (Hobby план дээр өдөрт 1 л удаа зөвшөөрдөг). Өдөрт 4 удаа шалгахын тулд GitHub repo-ийн Settings → Secrets дээр `SITE_URL`, `CRON_SECRET` нэмбэл [.github/workflows/ingest.yml](.github/workflows/ingest.yml) 6 цаг тутам endpoint-ийг дуудна.

## Quota тооцоо

YouTube API өдөрт 10,000 unit өгдөг. Суваг бүрийн шинэ бичлэг шалгахад ~1-2 unit, идэвхтэй бичлэгүүдийн availability sweep 50 бичлэг тутамд 1 unit. 20 суваг × 500 бичлэг × 4 удаа/өдөр ≈ 900 unit — хангалттай багтана.

## Дараагийн үе шат (MVP-д ороогүй)

- Хэрэглэгчийн бүртгэл, дуртай жагсаалт, сэтгэгдэл
- Кино бус категориуд (түүх, шинжлэх ухаан...) — schema бэлэн, UI хийгдээгүй
- Тааруулалтыг Claude API-аар сайжруулах (одоо regex + heuristic)
