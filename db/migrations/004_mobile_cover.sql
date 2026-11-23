-- Optional cover shown on phones instead of cover_id, usually an upright photo. Empty uses cover_id.
alter table albums
  add column mobile_cover_id text not null default '';
