/**
 * YouTube Data API v3 wrapper.
 * Quota notes: playlistItems.list = 1 unit, videos.list = 1 unit, channels.list = 1 unit.
 * search.list (100 units) is intentionally never used.
 */

const API_BASE = "https://www.googleapis.com/youtube/v3";

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY тохируулагдаагүй байна");
  return key;
}

async function yt<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey());

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${endpoint} failed (${res.status}): ${body.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

export interface YtChannelInfo {
  id: string;
  title: string;
  handle: string | null;
  avatarUrl: string | null;
  uploadsPlaylistId: string;
}

interface ChannelsResponse {
  items?: {
    id: string;
    snippet: {
      title: string;
      customUrl?: string;
      thumbnails?: { medium?: { url: string }; default?: { url: string } };
    };
    contentDetails: { relatedPlaylists: { uploads: string } };
  }[];
}

/**
 * Resolve a channel from a UC... id, an @handle, or a full channel URL.
 */
export async function getChannelInfo(input: string): Promise<YtChannelInfo | null> {
  let trimmed = input.trim();

  // Full URL forms: youtube.com/@handle, youtube.com/channel/UC...
  const urlMatch = trimmed.match(/youtube\.com\/(?:channel\/(UC[\w-]+)|(@[\w.-]+))/i);
  if (urlMatch) trimmed = urlMatch[1] ?? urlMatch[2];

  const params: Record<string, string> = {
    part: "snippet,contentDetails",
    maxResults: "1",
  };
  if (/^UC[\w-]{20,}$/.test(trimmed)) params.id = trimmed;
  else params.forHandle = trimmed.replace(/^@/, "");

  const data = await yt<ChannelsResponse>("channels", params);
  const item = data.items?.[0];
  if (!item) return null;

  return {
    id: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl?.replace(/^@/, "") ?? null,
    avatarUrl:
      item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  };
}

export interface YtPlaylistVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null;
}

interface PlaylistItemsResponse {
  nextPageToken?: string;
  items?: {
    snippet: {
      title: string;
      publishedAt: string;
      resourceId: { videoId: string };
      thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
    };
    contentDetails?: { videoPublishedAt?: string };
  }[];
}

export async function listUploads(
  uploadsPlaylistId: string,
  pageToken?: string
): Promise<{ videos: YtPlaylistVideo[]; nextPageToken: string | null }> {
  const params: Record<string, string> = {
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: "50",
  };
  if (pageToken) params.pageToken = pageToken;

  const data = await yt<PlaylistItemsResponse>("playlistItems", params);
  const videos = (data.items ?? [])
    .filter((i) => i.snippet.title !== "Private video" && i.snippet.title !== "Deleted video")
    .map((i) => ({
      videoId: i.snippet.resourceId.videoId,
      title: i.snippet.title,
      publishedAt: i.contentDetails?.videoPublishedAt ?? i.snippet.publishedAt,
      thumbnailUrl:
        i.snippet.thumbnails?.high?.url ??
        i.snippet.thumbnails?.medium?.url ??
        i.snippet.thumbnails?.default?.url ??
        null,
    }));

  return { videos, nextPageToken: data.nextPageToken ?? null };
}

export interface YtVideoDetails {
  videoId: string;
  durationSeconds: number;
  viewCount: number | null;
  isEmbeddable: boolean;
  isPublic: boolean;
}

interface VideosResponse {
  items?: {
    id: string;
    contentDetails: { duration: string };
    statistics?: { viewCount?: string };
    status: { embeddable: boolean; privacyStatus: string };
  }[];
}

/** ISO 8601 duration (PT1H2M3S) -> seconds */
export function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0);
}

/**
 * Fetch details for up to 50 ids per call. Ids missing from the response
 * are deleted videos - the caller should mark them unavailable.
 */
export async function getVideoDetails(videoIds: string[]): Promise<Map<string, YtVideoDetails>> {
  const result = new Map<string, YtVideoDetails>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await yt<VideosResponse>("videos", {
      part: "contentDetails,statistics,status",
      id: batch.join(","),
      maxResults: "50",
    });
    for (const item of data.items ?? []) {
      result.set(item.id, {
        videoId: item.id,
        durationSeconds: parseIsoDuration(item.contentDetails.duration),
        viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
        isEmbeddable: item.status.embeddable,
        isPublic: item.status.privacyStatus === "public",
      });
    }
  }
  return result;
}
