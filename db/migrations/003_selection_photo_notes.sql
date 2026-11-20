-- Per-photo retouch requests sent with the client's picks: { "<photo id>": "<request>" }.
alter table album_selections
  add column photo_notes jsonb not null default '{}'::jsonb;
