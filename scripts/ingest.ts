/**
 * CLI ingestion worker.
 *   npm run ingest                       - sync all active channels
 *   npm run ingest -- UCxxxx             - sync a single channel by id
 *   npm run ingest -- --rematch          - retry TMDB matching for unmatched videos
 *   npm run ingest -- --backfill-details - fill in runtime/imdb_id/budget/... for movies missing them
 *   npm run ingest -- --backfill-countries - fill in production_countries for movies missing it
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "../src/lib/supabase";
import {
  backfillMovieCountries,
  backfillMovieDetails,
  ingestAll,
  rematchUnmatched,
  syncChannel,
} from "../src/lib/ingest";
import { Channel } from "../src/lib/types";

async function main() {
  const db = getDb();
  const arg = process.argv[2];

  if (arg === "--rematch") {
    const { matched, total } = await rematchUnmatched(db);
    console.log(`Дахин тааруулалт: ${matched}/${total} бичлэг таарлаа.`);
    return;
  }

  if (arg === "--backfill-details") {
    const { updated, total } = await backfillMovieDetails(db);
    console.log(`Дэлгэрэнгүй мэдээлэл нөхөлт: ${updated}/${total} кино шинэчлэгдлээ.`);
    return;
  }

  if (arg === "--backfill-countries") {
    const { updated, total } = await backfillMovieCountries(db);
    console.log(`Улсын мэдээлэл нөхөлт: ${updated}/${total} кино шинэчлэгдлээ.`);
    return;
  }

  if (arg) {
    const { data: channel, error } = await db.from("channels").select("*").eq("id", arg).single();
    if (error || !channel) {
      console.error(`Суваг олдсонгүй: ${arg}. Эхлээд /admin дээр нэмнэ үү.`);
      process.exit(1);
    }
    const r = await syncChannel(db, channel as Channel);
    console.log(JSON.stringify(r, null, 2));
    return;
  }

  const results = await ingestAll(db);
  for (const r of results) {
    const status = r.error ? `АЛДАА: ${r.error}` : "OK";
    console.log(
      `${r.channelTitle}: шинэ=${r.newVideos}, таарсан=${r.matched}, идэвхгүй=${r.markedUnavailable} [${status}]`
    );
  }
  if (results.some((r) => r.error)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
