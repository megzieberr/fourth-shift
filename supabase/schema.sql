-- ════════════════════════════════════════════════════════════════════
-- Fourth Shift — schema. Idempotent: safe to run more than once.
-- Run in the Supabase dashboard SQL editor of the NEW fourth-shift
-- project (never the NWU hub project). Then run your filled-in
-- seed-private.sql to map the four real accounts.
-- ════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────
create table if not exists public.members (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text not null,
  ink          text not null default '#2E6C9E',
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.tasks (
  id         bigint generated always as identity primary key,
  station    int  not null check (station between 1 and 9),
  position   int  not null default 0,
  title      text not null check (length(title) between 1 and 140),
  note       text not null default '' check (length(note) <= 300),
  link       text not null default '' check (length(link) <= 400),
  assignee   uuid references public.members(id) on delete set null,
  done_by    uuid references public.members(id) on delete set null,
  done_at    timestamptz,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One stamp per member on "Everyone" cards (tasks with no assignee).
-- Assigned cards keep the single done_by stamp on tasks.
create table if not exists public.task_punches (
  task_id   bigint not null references public.tasks(id) on delete cascade,
  member_id uuid   not null references public.members(id) on delete cascade,
  at        timestamptz not null default now(),
  primary key (task_id, member_id)
);

create table if not exists public.punch_log (
  id         bigint generated always as identity primary key,
  member_id  uuid references public.members(id) on delete set null,
  action     text not null,
  task_title text not null default '',
  at         timestamptz not null default now()
);

-- ── RLS: reads for crew members only, NO direct write policies ──────
alter table public.members      enable row level security;
alter table public.tasks        enable row level security;
alter table public.task_punches enable row level security;
alter table public.punch_log    enable row level security;

-- Membership check lives in a SECURITY DEFINER helper: a policy on members that
-- selects from members recurses into itself (42P17) — found live 2026-08-29.
create or replace function public.is_crew() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from members where id = auth.uid()) $$;

drop policy if exists members_read      on public.members;
drop policy if exists tasks_read        on public.tasks;
drop policy if exists task_punches_read on public.task_punches;
drop policy if exists punch_log_read    on public.punch_log;

create policy members_read      on public.members      for select to authenticated using (public.is_crew());
create policy tasks_read        on public.tasks        for select to authenticated using (public.is_crew());
create policy task_punches_read on public.task_punches for select to authenticated using (public.is_crew());
create policy punch_log_read    on public.punch_log    for select to authenticated using (public.is_crew());

-- Belt and braces: anon gets nothing, and no client ever writes tables directly.
revoke all on public.members, public.tasks, public.task_punches, public.punch_log from anon;
revoke insert, update, delete on public.members, public.tasks, public.task_punches, public.punch_log
  from authenticated;

-- ── Helpers ─────────────────────────────────────────────────────────
create or replace function public.assert_crew() returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists (select 1 from members where id = uid) then
    raise exception 'Not a crew member.';
  end if;
  return uid;
end $$;

-- ── RPCs (the ONLY write path) ──────────────────────────────────────
-- "Everyone" cards (assignee null): one stamp per member, you only toggle YOURS.
-- Assigned cards: single shared stamp on tasks.done_by, as before.
create or replace function public.punch_task(p_task_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := assert_crew(); t record;
begin
  select id, title, assignee, done_by into t from tasks where id = p_task_id;
  if not found then raise exception 'Card not found.'; end if;
  if t.assignee is null then
    insert into task_punches (task_id, member_id) values (t.id, uid)
      on conflict do nothing;
    if not found then return; end if;  -- already stamped by you — nothing to do
  else
    update tasks set done_by = uid, done_at = now()
      where id = t.id and done_by is null;
    if not found then raise exception 'Card already punched.'; end if;
  end if;
  insert into punch_log (member_id, action, task_title) values (uid, 'punched', t.title);
end $$;

create or replace function public.unpunch_task(p_task_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := assert_crew(); t record;
begin
  select id, title, assignee, done_by into t from tasks where id = p_task_id;
  if not found then return; end if;
  if t.assignee is null then
    delete from task_punches where task_id = t.id and member_id = uid;
    if not found then return; end if;  -- you had no stamp here; others' stamps untouchable
  else
    if t.done_by is null then return; end if;
    update tasks set done_by = null, done_at = null where id = t.id;
  end if;
  insert into punch_log (member_id, action, task_title) values (uid, 'unpunched', t.title);
end $$;

create or replace function public.add_task(
  p_station int, p_title text, p_note text default '',
  p_link text default '', p_assignee uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := assert_crew(); next_pos int;
begin
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'A card needs a title.';
  end if;
  select coalesce(max(position), 0) + 1 into next_pos from tasks where station = p_station;
  insert into tasks (station, position, title, note, link, assignee, created_by)
  values (p_station, next_pos, trim(p_title),
          coalesce(trim(p_note), ''), coalesce(trim(p_link), ''), p_assignee, uid);
  insert into punch_log (member_id, action, task_title) values (uid, 'added', trim(p_title));
end $$;

create or replace function public.edit_task(
  p_task_id bigint, p_title text, p_note text default '',
  p_link text default '', p_assignee uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := assert_crew(); can_edit boolean;
begin
  select (t.created_by = uid or t.created_by is null
          or exists (select 1 from members m where m.id = uid and m.is_admin))
    into can_edit from tasks t where t.id = p_task_id;
  if can_edit is null then raise exception 'Card not found.'; end if;
  if not can_edit then raise exception 'Only the card''s creator (or the admin) can edit it.'; end if;
  update tasks set title = trim(p_title), note = coalesce(trim(p_note), ''),
                   link = coalesce(trim(p_link), ''), assignee = p_assignee
    where id = p_task_id;
  insert into punch_log (member_id, action, task_title) values (uid, 'edited', trim(p_title));
end $$;

create or replace function public.delete_task(p_task_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := assert_crew(); t_title text;
begin
  if not exists (select 1 from members m where m.id = uid and m.is_admin) then
    raise exception 'Only the admin can delete cards.';
  end if;
  delete from tasks where id = p_task_id returning title into t_title;
  if t_title is null then return; end if;
  insert into punch_log (member_id, action, task_title) values (uid, 'deleted', t_title);
end $$;

-- Note: NO RPC touches members.is_admin — it is set only by seed-private.sql.

-- Lock RPC execution: anon can't even call them; assert_crew is internal-only.
revoke execute on function public.punch_task(bigint), public.unpunch_task(bigint),
  public.add_task(int, text, text, text, uuid), public.edit_task(bigint, text, text, text, uuid),
  public.delete_task(bigint), public.is_crew(), public.assert_crew()
  from public, anon;
revoke execute on function public.assert_crew() from authenticated;
grant execute on function public.punch_task(bigint), public.unpunch_task(bigint),
  public.add_task(int, text, text, text, uuid), public.edit_task(bigint, text, text, text, uuid),
  public.delete_task(bigint), public.is_crew()
  to authenticated;

-- ── Realtime ────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.punch_log;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.task_punches;
exception when duplicate_object then null; end $$;

-- ── One-off backfill: everyone-cards stamped under the old single-stamp
--    model move their stamp into task_punches (idempotent, no-op after) ──
insert into public.task_punches (task_id, member_id, at)
select id, done_by, coalesce(done_at, now()) from public.tasks
where assignee is null and done_by is not null
on conflict do nothing;
update public.tasks set done_by = null, done_at = null
where assignee is null and done_by is not null;

-- ── Seed the job-card skeleton (only when tasks is empty) ───────────
-- (Mirror of js/skeleton-tasks.js — edit cards in the app afterwards.)
insert into public.tasks (station, position, title, note)
select * from (values
  (1, 1, 'Confirm you''re in the RIGHT tutor WhatsApp group', '13 groups exist — the wrong one means missing A2 information. Check with the tutor if unsure.'),
  (1, 2, 'Watch for the tutor''s email with the group list', 'Names, phone numbers, emails of the other three.'),
  (1, 3, 'Create the group WhatsApp and get all four in', 'Someone unreachable? Contact the tutor immediately — that''s the official route.'),
  (1, 4, 'Everyone clocks in on this board once', 'Proves the login works before it matters.'),
  (1, 5, 'Ask the tutor: is the A2 mark shared or split?', 'This decides how much each member''s part counts.'),
  (2, 1, 'Everyone reads the full brief — same day it lands', ''),
  (2, 2, 'List the four tasks, lengths and rubric on this card', 'Edit this card''s note once the brief is out.'),
  (2, 3, 'Divide the work — name an owner per task', ''),
  (2, 4, 'Set internal deadlines — group cut-off Friday 18 Sep, not the 20th', ''),
  (3, 1, 'Everyone reads student X''s essay in full', ''),
  (3, 2, 'Read the conclusion FIRST — the thesis lives there', 'The intro''s thesis is a reworded version of what their conclusion already says.'),
  (3, 3, 'List the body''s main ideas, in order', 'That list, turned into a sentence, IS the preview.'),
  (4, 1, 'Draft the background (about 2 sentences)', ''),
  (4, 2, 'Draft the problem statement', 'Ends with a mental question mark.'),
  (4, 3, 'Draft the thesis — reworded from student X''s conclusion', ''),
  (4, 4, 'Turn the main-idea list into the preview sentence', ''),
  (4, 5, 'Assemble: ONE paragraph, no line breaks, 3+ connectors', 'Follow the formula. Signpost phrases are fine and expected.'),
  (4, 6, 'Check against the Addendum C checklist', 'Workbook printed p.269.'),
  (5, 1, 'Task 2 — details land 7 Sep', ''),
  (5, 2, 'Task 3 — details land 7 Sep', ''),
  (5, 3, 'Task 4 — details land 7 Sep', ''),
  (6, 1, 'Full-group read-through of everything', ''),
  (6, 2, 'Any references in NWU Harvard style', ''),
  (6, 3, 'Submit on eFundi — due Sun 20 Sep 23:55', 'Problems? Email the lecturer BEFORE the deadline. No extensions.'),
  (6, 4, 'Screenshot the submission confirmation into WhatsApp', '')
) as seed(station, position, title, note)
where not exists (select 1 from public.tasks);
