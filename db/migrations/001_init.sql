-- PICORA schema. Every studio is a tenant: albums, photos and memberships carry studio_id
-- and are guarded by row-level security for the application role.

do $$
begin
  if not exists (select from pg_roles where rolname = 'picora_app') then
    create role picora_app nologin;
  end if;
end
$$;

create table users (
  id text primary key,
  name text not null,
  email text not null,
  password_hash text not null,
  platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));

create table studios (
  id text primary key,
  slug text not null unique,
  name text not null,
  plan_id text not null default 'free',
  status text not null default 'active' check (status in ('active', 'suspended')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table memberships (
  user_id text not null references users (id) on delete cascade,
  studio_id text not null references studios (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (user_id, studio_id)
);
create index memberships_studio_idx on memberships (studio_id);

create table sessions (
  token_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  studio_id text references studios (id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);

create table albums (
  id text primary key,
  studio_id text not null references studios (id) on delete cascade,
  slug text not null,
  name text not null,
  customer_name text not null default '',
  customer_phone text not null default '',
  occasion text not null default 'Other',
  shooting_date date,
  description text not null default '',
  cover_id text not null default '',
  cover_key text not null default '',
  password text not null default '',
  expires_at date,
  status text not null check (status in ('published', 'draft', 'hidden')),
  template_id text not null,
  allow_download boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, slug)
);
create index albums_slug_idx on albums (slug);

create table photos (
  id text primary key,
  album_id text not null references albums (id) on delete cascade,
  studio_id text not null references studios (id) on delete cascade,
  position integer not null,
  name text not null,
  unsplash text,
  storage_key text,
  focal text not null default 'center',
  width integer not null,
  height integer not null,
  size bigint not null,
  uploaded_at timestamptz not null default now(),
  check (unsplash is not null or storage_key is not null)
);
create index photos_album_idx on photos (album_id, position);
create index photos_studio_idx on photos (studio_id);

-- Requests run inside a transaction that sets app.studio_id (studio-scoped routes) or
-- app.bypass = 'on' (sign-in, public galleries, platform console).
create function app_can_access(row_studio text) returns boolean
language sql stable as $$
  select coalesce(current_setting('app.bypass', true), '') = 'on'
      or row_studio = nullif(current_setting('app.studio_id', true), '')
$$;

alter table albums enable row level security;
alter table photos enable row level security;
alter table memberships enable row level security;

create policy albums_tenant on albums using (app_can_access(studio_id)) with check (app_can_access(studio_id));
create policy photos_tenant on photos using (app_can_access(studio_id)) with check (app_can_access(studio_id));
create policy memberships_tenant on memberships using (app_can_access(studio_id)) with check (app_can_access(studio_id));

grant select, insert, update, delete on users, studios, memberships, sessions, albums, photos to picora_app;
grant execute on function app_can_access(text) to picora_app;
alter default privileges in schema public grant select, insert, update, delete on tables to picora_app;
