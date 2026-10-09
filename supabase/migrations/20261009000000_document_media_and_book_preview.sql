alter table documents
  add column trailer_youtube_url text,
  add column trailer_poster_url text,
  add column author_audio_url text,
  add column original_music_url text,
  add column yandex_music_url text,
  add column spotify_url text,
  add column book_relationship text not null default 'standalone',
  add column book_preview_text text,
  add column book_preview_order integer,
  add column book_card_text text;

alter table documents
  add constraint documents_book_relationship_check
  check (book_relationship in ('standalone', 'included', 'excerpt')),
  add constraint documents_book_preview_order_check
  check (book_preview_order is null or book_preview_order >= 0),
  add constraint documents_book_card_text_length_check
  check (book_card_text is null or char_length(book_card_text) <= 400),
  add constraint documents_book_preview_text_length_check
  check (book_preview_text is null or char_length(book_preview_text) <= 3000);

comment on column documents.book_preview_text is
  'Author-selected excerpt shown in the interactive preview of Поговорим без слайдов.';
comment on column documents.book_card_text is
  'Short author-selected text for a 1080x1350 social card; limited to 400 characters.';

create index documents_book_preview_order_idx
  on documents (book_preview_order)
  where site_status = 'published' and book_relationship = 'excerpt';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-audio',
  'document-audio',
  true,
  104857600,
  array['audio/mpeg', 'audio/mp3']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "document_audio_select"
on storage.objects for select
to public
using (bucket_id = 'document-audio');

create policy "document_audio_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'document-audio'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "document_audio_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'document-audio'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'document-audio'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "document_audio_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'document-audio'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);
