import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Wildcard: admins can paste a poster URL from any host for movies
      // TMDB has no poster for (see updateMoviePoster in admin/movies/actions.ts),
      // on top of the known TMDB/YouTube hosts everything else uses.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
