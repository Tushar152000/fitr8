-- Food search (GET /api/foods?q=) filters with `name ILIKE '%q%' OR aliases @> ARRAY[q]`.
-- A B-tree index can serve neither; a trigram GIN index on name and a GIN index on aliases can
-- (combined with a BitmapOr). pg_trgm ships with PostgreSQL (and Cloud SQL). Additive only.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "foods_name_trgm_idx" ON "foods" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "foods_aliases_idx" ON "foods" USING GIN ("aliases");
