-- Monthly plan expiry and manual VietQR transfer confirmation with platform admin approval.

alter table studios
  add column plan_expires_at timestamptz;

-- Existing paid studios stay active until the 1st of next month (Vietnam time).
update studios
set plan_expires_at = (date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') + interval '1 month') at time zone 'Asia/Ho_Chi_Minh'
where plan_id <> 'free' and plan_expires_at is null;

create table platform_settings (
  id text primary key default 'default' check (id = 'default'),
  bank_id text not null default '',
  bank_account text not null default '',
  account_name text not null default '',
  transfer_prefix text not null default 'PICORA',
  updated_at timestamptz not null default now()
);

insert into platform_settings (id) values ('default') on conflict do nothing;

create table payment_requests (
  id text primary key,
  studio_id text not null references studios (id) on delete cascade,
  user_id text references users (id) on delete set null,
  kind text not null check (kind in ('change', 'renew')),
  target_plan_id text not null,
  amount integer not null check (amount > 0),
  transfer_code text not null,
  receipt_key text not null,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text not null default '',
  reviewed_by text references users (id) on delete set null,
  reviewed_at timestamptz,
  applied_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index payment_requests_studio_idx on payment_requests (studio_id, created_at desc);
create index payment_requests_status_idx on payment_requests (status, created_at desc);

alter table payment_requests enable row level security;

create policy payment_requests_tenant on payment_requests
  using (app_can_access(studio_id))
  with check (app_can_access(studio_id));

grant select, insert, update, delete on platform_settings, payment_requests to picora_app;
