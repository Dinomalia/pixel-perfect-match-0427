-- Estrutura relacional complementar mantendo public.planner_state intacto

create table if not exists public.parent_projects (
  id text primary key,
  company_id text not null,
  code text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_phases (
  id text primary key,
  parent_project_id text not null references public.parent_projects(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.document_stages (
  id text primary key,
  name text not null,
  color text not null default '#3b82f6',
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text primary key,
  parent_project_id text references public.parent_projects(id) on delete set null,
  phase_id text references public.project_phases(id) on delete set null,
  doc_type text not null,
  title text not null,
  revision text not null default '0',
  status text not null default 'Elaboração',
  priority text not null default 'Média',
  due_date text,
  sandech_code text,
  client_code text,
  planner_task_id text,
  ged_link text,
  folder_path text,
  notes text,
  assignees jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  quality_rework integer not null default 0,
  quality_rework_note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents add column if not exists sandech_code text;
alter table public.documents add column if not exists client_code text;
alter table public.documents add column if not exists planner_task_id text;
alter table public.documents add column if not exists phase_id text;
alter table public.documents add column if not exists ged_link text;
alter table public.documents add column if not exists folder_path text;

create unique index if not exists idx_documents_planner_task_id
  on public.documents (planner_task_id)
  where planner_task_id is not null;

create table if not exists public.daily_time_logs (
  id text primary key,
  task_id text not null,
  person_id text,
  work_date text not null,
  hours numeric(6,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

insert into public.document_stages (id, name, color, order_index) values
  ('st-elaboracao', 'Elaboração', '#eab308', 0),
  ('st-verificacao', 'Verificação', '#8b5cf6', 1),
  ('st-qualidade', 'Qualidade', '#3b82f6', 2),
  ('st-retrabalho', 'Retrabalho', '#f97316', 3),
  ('st-aprovacao', 'Em Aprovação', '#06b6d4', 4),
  ('st-aprovado', 'Aprovado', '#22c55e', 5),
  ('st-hold', 'Hold', '#64748b', 6)
on conflict (id) do nothing;

alter table public.parent_projects enable row level security;
alter table public.project_phases enable row level security;
alter table public.document_stages enable row level security;
alter table public.documents enable row level security;
alter table public.daily_time_logs enable row level security;

drop policy if exists "public_rw_parent_projects" on public.parent_projects;
drop policy if exists "public_rw_project_phases" on public.project_phases;
drop policy if exists "public_rw_document_stages" on public.document_stages;
drop policy if exists "public_rw_documents" on public.documents;
drop policy if exists "public_rw_daily_time_logs" on public.daily_time_logs;

revoke all on public.parent_projects, public.project_phases, public.document_stages, public.documents, public.daily_time_logs from anon;
revoke all on public.parent_projects, public.project_phases, public.document_stages, public.documents, public.daily_time_logs from authenticated;
grant all on public.parent_projects, public.project_phases, public.document_stages, public.documents, public.daily_time_logs to service_role;
