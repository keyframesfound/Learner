-- One-off: clear every class and create "F2 Science" for the staff account.
-- Run: psql "$DATABASE_URL" -f ops/f2-class.sql
begin;

delete from classes;

insert into users (auth_id, email, name, role)
select id, email, name, 'teacher' from "user"
 where lower(email) = 'developer@ssc.edu.hk'
on conflict (auth_id) do update set role = 'teacher';

insert into classes (teacher_id, name, module_id, join_code)
select u.id, 'F2 Science', 'sci.f2', 'F2SCI1'
  from users u
 where lower(u.email) = 'developer@ssc.edu.hk'
 limit 1;

commit;
