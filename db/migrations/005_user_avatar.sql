-- Profile photo of the account, stored under users/<user id>/. Empty shows initials.
alter table users
  add column avatar_key text not null default '';
