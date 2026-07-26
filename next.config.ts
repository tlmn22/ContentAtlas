import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel's Image Optimization has a monthly source-image quota that this
    // catalog (hundreds of TMDB posters/backdrops + channel avatars) blows
    // past, at which point every remote image 402s in production while still
    // working fine locally. Serve remote images as-is instead of proxying
    // them through Vercel's optimizer - TMDB/YouTube already return
    // reasonably-sized images, so this costs little.
    unoptimized: true,
    remotePatterns: [
      // Wildcard: admins can paste a poster URL from any host for movies
      // TMDB has no poster for (see updateMoviePoster in admin/movies/actions.ts),
      // on top of the known TMDB/YouTube hosts everything else uses.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
