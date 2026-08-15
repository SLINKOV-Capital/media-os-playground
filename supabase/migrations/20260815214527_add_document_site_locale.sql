-- Prepare public document URLs for locale-aware routing.
-- Keep documents_site_slug_published_idx during the compatibility rollout.

alter table public.documents
  add column if not exists site_locale text not null default 'ru';

update public.documents
set site_locale = 'ru'
where site_locale is null;

alter table public.documents
  drop constraint if exists documents_site_locale_check;

alter table public.documents
  add constraint documents_site_locale_check
  check (site_locale in ('ru', 'en', 'es'));

comment on column public.documents.site_locale is
  'Locale of the published document. Prepared for future extraction into a localization table.';

create unique index if not exists documents_site_locale_slug_published_idx
  on public.documents (site_locale, site_slug)
  where site_status = 'published' and site_slug is not null;
