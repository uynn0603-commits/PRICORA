-- Which invitation design a studio picked. Existing thiệp stay on the original card.
alter table invitations
  add column template_id text not null default 'classic';
