create extension if not exists pgcrypto;

create table if not exists ligantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  periodo text,
  na_rodagem boolean not null default false,
  created_at timestamptz not null default now()
);

-- Garante a coluna em bancos que já tinham a tabela ligantes antes da rodagem existir.
alter table ligantes add column if not exists na_rodagem boolean not null default false;

create table if not exists escalas (
  id uuid primary key default gen_random_uuid(),
  ligante_id uuid not null references ligantes(id) on delete cascade,
  local text not null check (local in ('CTI', 'UPA')),
  data date not null,
  turno text not null check (turno in ('Manhã', 'Tarde', 'Noite')),
  created_at timestamptz not null default now()
);

create table if not exists reunioes (
  id uuid primary key default gen_random_uuid(),
  tema text not null,
  data date not null,
  responsavel text,
  presentes uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date not null,
  tipo text not null default 'Simpósio',
  status text not null default 'Planejamento'
    check (status in ('Planejamento', 'Confirmado', 'Realizado')),
  checklist jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists ciclos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  inicio date not null,
  semanas int not null default 8,
  -- [{ ligante_id, dia (0=Dom..6=Sáb) }]
  upa jsonb not null default '[]',
  -- [{ ligante_id, dia, turno: 'dia'|'noite' }]
  cti jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table ligantes enable row level security;
alter table escalas  enable row level security;
alter table reunioes enable row level security;
alter table eventos  enable row level security;
alter table ciclos   enable row level security;

create policy "authenticated full access" on ligantes
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on escalas
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on reunioes
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on eventos
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on ciclos
  for all to authenticated using (true) with check (true);
