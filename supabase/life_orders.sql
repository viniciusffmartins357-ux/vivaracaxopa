-- Life Anéis | Pedidos protegidos para Vercel + Supabase.
-- Execute uma única vez no SQL Editor do seu projeto Supabase.
create extension if not exists pgcrypto;

create table if not exists public.life_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  access_hash text not null unique,
  status text not null default 'creating' check (status in ('creating','pending','processing','under_review','approved','failed','refunded','chargeback')),
  amount_cents integer not null check (amount_cents > 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  shipping_method text not null check (shipping_method in ('free','standard','express')),
  items jsonb not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  address jsonb not null,
  gateway_transaction_id text,
  pix_code text,
  pix_qr_image text,
  expires_at text,
  tracking_code text,
  shipping_status text not null default 'preparing' check (shipping_status in ('preparing','shipped','delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_life_orders_status on public.life_orders(status,created_at desc);
create index if not exists idx_life_orders_gateway on public.life_orders(gateway_transaction_id);

alter table public.life_orders enable row level security;
-- Sem policies: usuários anônimos e autenticados não conseguem ler/gravar pedidos.
-- Só as funções da Vercel usando SUPABASE_SECRET_KEY devem acessar esta tabela.
revoke all on table public.life_orders from anon,authenticated;
comment on table public.life_orders is 'Pedidos Life Anéis. CPF não é armazenado: somente enviado à gateway no servidor.';
