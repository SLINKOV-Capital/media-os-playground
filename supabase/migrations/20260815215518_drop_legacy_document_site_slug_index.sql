-- Locale-aware routing is verified on test.soloten.com.
-- The composite published-slug index is now the only uniqueness rule.

drop index if exists public.documents_site_slug_published_idx;
