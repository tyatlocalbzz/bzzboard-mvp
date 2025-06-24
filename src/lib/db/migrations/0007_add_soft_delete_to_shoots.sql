-- Add soft delete fields to shoots table
ALTER TABLE "shoots" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "shoots" ADD COLUMN "deleted_by" integer REFERENCES "users"("id");

-- Add index for better performance on soft delete queries
CREATE INDEX "idx_shoots_deleted_at" ON "shoots"("deleted_at");
CREATE INDEX "idx_shoots_active" ON "shoots"("deleted_at") WHERE "deleted_at" IS NULL; 