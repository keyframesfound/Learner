-- Staff allowlist, editable from /teach/admin.
--
-- The environment lists (ADMIN_EMAILS / TEACHER_EMAILS) still win, so a school
-- that locks itself out can always be repaired from the server without the app.
-- Addresses here are stored lowercased; the app compares lower(email).
create table if not exists teachers (
  email      text primary key,
  role       user_role not null default 'teacher',
  added_by   uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
