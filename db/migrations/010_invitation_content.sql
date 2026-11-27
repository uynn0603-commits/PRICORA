-- Structured fields for the Traditional Wedding template. Classic and Golden Letter
-- keep using the existing columns; this document is empty for those rows.
alter table invitations
  add column content jsonb not null default '{}'::jsonb;
