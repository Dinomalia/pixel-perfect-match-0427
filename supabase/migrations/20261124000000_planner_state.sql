create table if not exists public.planner_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planner_state enable row level security;

drop policy if exists "planner_state_rw" on public.planner_state;
create policy "planner_state_rw"
  on public.planner_state
  for all
  to anon, authenticated
  using (true)
  with check (true);
