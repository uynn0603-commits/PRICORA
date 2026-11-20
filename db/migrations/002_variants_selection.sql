-- Resized copies made in the browser at upload time. Galleries load these; the original
-- in storage_key is only fetched for downloads.
alter table photos
  add column preview_key text,
  add column thumb_key text;

-- Client proofing: the customer picks photos for retouching and sends the list to the studio.
alter table albums
  add column selection_enabled boolean not null default false,
  add column selection_limit integer check (selection_limit is null or selection_limit > 0),
  add column selection_locked boolean not null default false;

create table album_selections (
  album_id text primary key references albums (id) on delete cascade,
  studio_id text not null references studios (id) on delete cascade,
  photo_ids text[] not null default '{}',
  note text not null default '',
  submitted_at timestamptz not null default now()
);
create index album_selections_studio_idx on album_selections (studio_id);

alter table album_selections enable row level security;
create policy album_selections_tenant on album_selections using (app_can_access(studio_id)) with check (app_can_access(studio_id));
grant select, insert, update, delete on album_selections to picora_app;
