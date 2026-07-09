/**
 * CLI ingestion worker.
 *   npm run ingest              - sync all active channels
 *   npm run ingest -- UCxxxx    - sync a single channel by id
 */
import "dotenv/config";
import { getDb } from "../src/lib/supabase";
import { ingestAll, syncChannel } from "../src/lib/ingest";
import { Channel } from "../src/lib/types";

async function main() {
  const db = getDb();
  const channelArg = process.argv[2];

  if (channelArg) {
    const { data: channel, error } = await db
      .from("channels")
      .select("*")
      .eq("id", channelArg)
      .single();
    if (error || !channel) {
      console.error(`Суваг олдсонгүй: ${channelArg}. Эхлээд /admin дээр нэмнэ үү.`);
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
