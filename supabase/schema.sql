create table if not exists public.candidates (
  id text primary key,
  code text not null unique,
  name text not null,
  email text,
  phone text,
  city text not null,
  program text not null,
  goals text not null,
  experience text not null,
  motivation_text text not null,
  essay_excerpt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evaluation_sessions (
  id text primary key,
  candidate_id text not null references public.candidates(id) on delete cascade,
  auth_session_id text not null unique,
  messages jsonb not null default '[]'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  progress integer not null default 12,
  status text not null default 'active',
  phase text not null default 'Foundation',
  score_update jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.committee_members (
  id text primary key,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_accounts (
  id text primary key,
  role text not null,
  name text not null,
  email text,
  phone text,
  password_hash text not null,
  entity_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.committee_votes (
  candidate_id text not null references public.candidates(id) on delete cascade,
  member_id text not null references public.committee_members(id) on delete cascade,
  member_name text not null,
  decision text not null,
  rationale text not null,
  created_at timestamptz not null default now(),
  primary key (candidate_id, member_id)
);

insert into storage.buckets (id, name, public)
values ('candidate-artifacts', 'candidate-artifacts', false)
on conflict (id) do nothing;
