-- Studio's answer to each retouch request: { photoId: { request, reply, doneAt, replaced } }.
-- An entry only counts while `request` still equals the client's current request, so a
-- client who rewrites the request sends the photo back to "needs editing".
alter table album_selections
  add column photo_edits jsonb not null default '{}'::jsonb;
