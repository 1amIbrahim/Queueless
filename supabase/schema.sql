-- ============================================================
-- QueueLess — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type user_role as enum ('patient', 'receptionist', 'doctor', 'admin');
create type specialty_type as enum (
  'general', 'cardiology', 'dermatology', 'orthopedics', 'pediatrics',
  'gynecology', 'neurology', 'ophthalmology', 'ent', 'psychiatry', 'urology', 'oncology'
);
create type queue_status as enum ('open', 'paused', 'closed');
create type token_type as enum ('app', 'walkin');
create type token_status as enum ('waiting', 'called', 'completed', 'no_show', 'cancelled');
create type notification_channel as enum ('sms', 'whatsapp');

-- ─── Users (extends Supabase auth.users) ─────────────────────────────────────

create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'patient',
  name        text not null,
  phone       text,
  hospital_id uuid,
  created_at  timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- Allow service role to manage all users (API)
create policy "Service role full access to users"
  on public.users for all using (auth.role() = 'service_role');

-- ─── Hospitals ────────────────────────────────────────────────────────────────

create table public.hospitals (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  lat        double precision not null,
  lng        double precision not null,
  address    text not null,
  phone      text,
  created_at timestamptz not null default now()
);

alter table public.hospitals enable row level security;

create policy "Anyone can read hospitals"
  on public.hospitals for select using (true);

create policy "Service role full access to hospitals"
  on public.hospitals for all using (auth.role() = 'service_role');

-- ─── Departments ─────────────────────────────────────────────────────────────

create table public.departments (
  id          uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  name        text not null,
  specialty   specialty_type not null
);

alter table public.departments enable row level security;

create policy "Anyone can read departments"
  on public.departments for select using (true);

create policy "Service role full access to departments"
  on public.departments for all using (auth.role() = 'service_role');

-- ─── Doctors ─────────────────────────────────────────────────────────────────

create table public.doctors (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.users(id) on delete set null,
  hospital_id   uuid not null references public.hospitals(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  name          text not null,
  specialty     specialty_type not null,
  working_hours jsonb not null default '{"start":"09:00","end":"17:00","days":[1,2,3,4,5]}',
  is_active     boolean not null default true
);

alter table public.doctors enable row level security;

create policy "Anyone can read doctors"
  on public.doctors for select using (true);

create policy "Service role full access to doctors"
  on public.doctors for all using (auth.role() = 'service_role');

-- ─── Queues ──────────────────────────────────────────────────────────────────

create table public.queues (
  id                      uuid primary key default uuid_generate_v4(),
  doctor_id               uuid not null references public.doctors(id) on delete cascade,
  date                    date not null,
  current_number          int not null default 0,
  last_called_number      int not null default 0,
  status                  queue_status not null default 'open',
  avg_minutes_per_patient int not null default 10,
  created_at              timestamptz not null default now(),
  unique (doctor_id, date)
);

alter table public.queues enable row level security;

create policy "Anyone can read queues"
  on public.queues for select using (true);

create policy "Service role full access to queues"
  on public.queues for all using (auth.role() = 'service_role');

-- ─── Tokens ──────────────────────────────────────────────────────────────────

create table public.tokens (
  id           uuid primary key default uuid_generate_v4(),
  queue_id     uuid not null references public.queues(id) on delete cascade,
  patient_id   uuid references public.users(id) on delete set null,
  patient_name text,
  patient_phone text,
  number       int not null,
  type         token_type not null default 'app',
  status       token_status not null default 'waiting',
  issued_at    timestamptz not null default now(),
  called_at    timestamptz,
  completed_at timestamptz,
  unique (queue_id, number)
);

alter table public.tokens enable row level security;

create policy "Patients can read own tokens"
  on public.tokens for select using (auth.uid() = patient_id);

create policy "Staff can read all tokens"
  on public.tokens for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('receptionist', 'doctor', 'admin')
    )
  );

create policy "Service role full access to tokens"
  on public.tokens for all using (auth.role() = 'service_role');

-- ─── Appointments ─────────────────────────────────────────────────────────────

create table public.appointments (
  id          uuid primary key default uuid_generate_v4(),
  token_id    uuid not null references public.tokens(id) on delete cascade,
  patient_id  uuid not null references public.users(id) on delete cascade,
  doctor_id   uuid not null references public.doctors(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  booked_at   timestamptz not null default now(),
  notes       text
);

alter table public.appointments enable row level security;

create policy "Patients can read own appointments"
  on public.appointments for select using (auth.uid() = patient_id);

create policy "Service role full access to appointments"
  on public.appointments for all using (auth.role() = 'service_role');

-- ─── Notifications ───────────────────────────────────────────────────────────

create table public.notifications (
  id        uuid primary key default uuid_generate_v4(),
  token_id  uuid not null references public.tokens(id) on delete cascade,
  channel   notification_channel not null,
  message   text not null,
  sent_at   timestamptz not null default now(),
  delivered boolean not null default false
);

alter table public.notifications enable row level security;

create policy "Service role full access to notifications"
  on public.notifications for all using (auth.role() = 'service_role');

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable Supabase Realtime for live queue updates

alter publication supabase_realtime add table public.tokens;
alter publication supabase_realtime add table public.queues;
