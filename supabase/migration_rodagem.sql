-- Migração incremental para adicionar o módulo Rodagem a um banco já existente.
-- Rode isto UMA VEZ no SQL Editor do Supabase (Dashboard → SQL Editor → New query).
-- (supabase/schema.sql já foi atualizado com o mesmo conteúdo para quem recriar o banco do zero.)

alter table ligantes add column if not exists na_rodagem boolean not null default false;

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

alter table ciclos enable row level security;

create policy "authenticated full access" on ciclos
  for all to authenticated using (true) with check (true);
