create extension if not exists pgcrypto;

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  quiz_version text not null default 'odyssey-v1',
  answers jsonb not null,
  written_response text not null check (char_length(written_response) between 10 and 2000),
  score smallint not null check (score between 0 and 4),
  total_questions smallint not null default 4 check (total_questions = 4),
  submitted_at timestamptz not null default now(),
  unique (student_id, quiz_version)
);

alter table public.quiz_attempts enable row level security;

create policy "Students can view only their own score"
on public.quiz_attempts
for select
to authenticated
using (student_id = auth.uid());
