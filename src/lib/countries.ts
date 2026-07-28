export interface Country {
  code: string; // ISO 3166-1 alpha-2, matches movies.production_countries entries
  name_mn: string;
}

/**
 * Curated list of countries worth browsing by (not every ISO code TMDB
 * returns) - shown in the Sidebar and used to resolve /hailt?country=XX
 * labels. Add more here as needed; no migration required since this isn't
 * backed by its own table.
 */
export const COUNTRIES: Country[] = [
  { code: "KR", name_mn: "Солонгос" },
  { code: "IN", name_mn: "Энэтхэг" },
  { code: "US", name_mn: "Америк" },
  { code: "CN", name_mn: "Хятад" },
  { code: "JP", name_mn: "Япон" },
  { code: "TH", name_mn: "Тайланд" },
  { code: "GB", name_mn: "Британи" },
  { code: "FR", name_mn: "Франц" },
  { code: "RU", name_mn: "Орос" },
];

export function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name_mn ?? code;
}
