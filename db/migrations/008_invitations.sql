-- Online invitations. A studio may have several per wedding (nhà trai, nhà gái), each
-- optionally drawing its photos from one album. The public page only renders `published`.

create table invitations (
  id text primary key,
  studio_id text not null references studios (id) on delete cascade,
  album_id text references albums (id) on delete set null,
  slug text not null,
  status text not null default 'draft' check (status in ('published', 'draft')),
  groom_name text not null default '',
  bride_name text not null default '',
  groom_parents text not null default '',
  bride_parents text not null default '',
  wedding_date date,
  wedding_time text not null default '',
  venue text not null default '',
  address text not null default '',
  map_url text not null default '',
  message text not null default '',
  thank_you text not null default '',
  music_url text not null default '',
  photo_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, slug)
);
create index invitations_studio_idx on invitations (studio_id, created_at desc);

alter table invitations enable row level security;
create policy invitations_tenant on invitations using (app_can_access(studio_id)) with check (app_can_access(studio_id));
grant select, insert, update, delete on invitations to picora_app;
