---
name: explore-constants-extraction
description: Explore feature constants were extracted to src/lib/explore-constants.ts to sync with DB enum and remove duplication
metadata:
  type: project
---

Explore feature had duplicated `getCategoryColor()`/`getCategoryLabel()` in both `src/app/explore/index.tsx` and `src/app/explore/[slug].tsx`, plus a `Category` type missing `lifestyle` (which exists in the DB enum `content_category` at `supabase/migrations/0001_init_schema.sql:39` and in `ContentCategory` at `src/lib/supabase.ts:11`).

Extracted to `src/lib/explore-constants.ts`: `CATEGORIES`, `CATEGORY_COLORS`, `CATEGORY_LABELS`, `CATEGORY_ICONS`, `SHARE_DOMAIN`, `VERIFIED_STAMP`, `EXPLORE_STATS`. If the DB enum gains a value, update only this file.

**Why:** Two screens drift out of sync with the DB enum; hard-coded values (`healthycheck.io`, `100% kiểm duyệt y khoa`) lived inline in the UI.

**How to apply:** When adding a new `content_category`, add it to `CATEGORIES` + the three `Record` maps in `explore-constants.ts`, not to each screen. Also run `scripts/gen-seed-articles.ts` to regenerate `supabase/migrations/0010_seed_local_articles.sql` when `src/data/health-articles.ts` changes — the 12 local articles (art-1..art-12) are not in the DB yet.