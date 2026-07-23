import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KinoTailbar — Кино тайлбарын нэгдсэн сан",
    short_name: "KinoTailbar",
    description: "Монгол хэл дээрх кино тайлбар бичлэгүүдийг нэг дороос.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0e14",
    theme_color: "#0c0e14",
    icons: [
      {
        src: "/icon.png",
        sizes: "540x540",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "540x540",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
