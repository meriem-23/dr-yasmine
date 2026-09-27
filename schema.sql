-- =====================================================================
-- Dr Akoubache Yasmine · Dentiste
-- Paste this whole file in Supabase > SQL Editor > New query > Run.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.settings (
  id   int primary key default 1 check (id = 1),
  data jsonb not null
);
insert into public.settings (id, data) values (1, '{
  "days":[6,0,1,2,3,4], "open":"09:00", "close":"17:00",
  "breakA":"12:00", "breakB":"13:30", "slot":30, "ahead":14,
  "phone":"", "addr":""
}') on conflict (id) do nothing;

create table if not exists public.patients (
  phone      text primary key,
  name       text not null,
  stamps     int  not null default 0 check (stamps between 0 and 9),
  cards      int  not null default 0 check (cards >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null references public.patients(phone) on update cascade,
  date       date not null,
  time       text not null check (time ~ '^\d{2}:\d{2}$'),
  service    text not null,
  note       text not null default '',
  status     text not null default 'pending'
             check (status in ('pending','confirmed','done','cancelled')),
  session    int,
  created_at timestamptz not null default now()
);
-- one patient per time slot (cancelled ones free the slot)
create unique index if not exists appointments_slot_unique
  on public.appointments (date, time) where status <> 'cancelled';
create index if not exists appointments_date_idx on public.appointments (date);

-- who can open admin.html
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ---------- security (Row Level Security) ----------
alter table public.settings     enable row level security;
alter table public.patients     enable row level security;
alter table public.appointments enable row level security;
alter table public.admins       enable row level security;

drop policy if exists "anyone reads settings"   on public.settings;
drop policy if exists "admin updates settings"  on public.settings;
drop policy if exists "admin manages patients"  on public.patients;
drop policy if exists "admin manages appts"     on public.appointments;
drop policy if exists "admin sees self"         on public.admins;

create policy "anyone reads settings"  on public.settings     for select using (true);
create policy "admin updates settings" on public.settings     for update using (is_admin()) with check (is_admin());
create policy "admin manages patients" on public.patients     for all    using (is_admin()) with check (is_admin());
create policy "admin manages appts"    on public.appointments for all    using (is_admin()) with check (is_admin());
create policy "admin sees self"        on public.admins       for select using (user_id = auth.uid());
-- Patients never read the tables directly: they only use the 3 functions below.

-- ---------- public functions (used by index.html) ----------

-- times already booked on a day (no names, no phones)
create or replace function public.taken_slots(p_date date) returns setof text
language sql stable security definer set search_path = public as $$
  select time from appointments where date = p_date and status <> 'cancelled';
$$;

-- a patient books an appointment
create or replace function public.book_appointment(
  p_name text, p_phone text, p_date date, p_time text, p_service text, p_note text default ''
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_today  date := (now() at time zone 'Africa/Algiers')::date;
  v_stamps int;
begin
  p_name := trim(p_name);
  p_note := left(coalesce(trim(p_note), ''), 300);
  if length(p_name) < 2 or length(p_name) > 80 then raise exception 'invalid_name'; end if;
  if p_phone !~ '^0\d{8,9}$'                      then raise exception 'invalid_phone'; end if;
  if p_date < v_today or p_date > v_today + 60     then raise exception 'invalid_date'; end if;
  if p_time !~ '^\d{2}:\d{2}$'                     then raise exception 'invalid_time'; end if;
  if (select count(*) from appointments
      where phone = p_phone and date >= v_today and status in ('pending','confirmed')) >= 3
    then raise exception 'too_many'; end if;

  insert into patients (phone, name) values (p_phone, p_name) on conflict (phone) do nothing;

  begin
    insert into appointments (name, phone, date, time, service, note)
    values (p_name, p_phone, p_date, p_time, left(p_service, 60), p_note);
  exception when unique_violation then
    raise exception 'slot_taken';
  end;

  select stamps into v_stamps from patients where phone = p_phone;
  return json_build_object('next_session', case when v_stamps >= 9 then 1 else v_stamps + 1 end);
end;
$$;

-- a patient looks at their fidelity card (first name only)
create or replace function public.get_card(p_phone text)
returns table (first_name text, stamps int, cards int)
language sql stable security definer set search_path = public as $$
  select split_part(name, ' ', 1), stamps, cards from patients where phone = p_phone;
$$;

revoke all on function public.taken_slots(date) from public;
revoke all on function public.book_appointment(text,text,date,text,text,text) from public;
revoke all on function public.get_card(text) from public;
grant execute on function public.taken_slots(date) to anon, authenticated;
grant execute on function public.book_appointment(text,text,date,text,text,text) to anon, authenticated;
grant execute on function public.get_card(text) to anon, authenticated;

-- live updates in the dashboard when a patient books
do $$ begin
  alter publication supabase_realtime add table public.appointments;
exception when duplicate_object then null; end $$;

-- =====================================================================
-- LAST STEP (after creating Yasmine's account in Authentication > Users):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'her-email@example.com';
-- =====================================================================
