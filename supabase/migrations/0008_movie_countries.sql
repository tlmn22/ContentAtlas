-- Lets movies be categorized by country of origin (e.g. "Солонгос кино",
-- "Энэтхэг кино") using TMDB's production_countries. Stored as a plain
-- ISO 3166-1 code array on the movie row rather than a join table, since
-- unlike genres it's only ever displayed via a small hardcoded list
-- (see src/lib/countries.ts), not a dynamic TMDB-sourced reference table.

alter table movies add column production_countries text[];
