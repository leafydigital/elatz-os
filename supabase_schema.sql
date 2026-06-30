-- ELATZ OS Schema
-- Run this in your Supabase SQL Editor
-- Safe to re-run: drops existing tables first

drop table if exists tasks cascade;
drop table if exists transactions cascade;
drop table if exists debts cascade;
drop table if exists subscriptions cascade;
drop table if exists businesses cascade;

-- Businesses
create table businesses (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text default '🏢',
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending','in_progress','done','deferred')),
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  task_type text default 'priority' check (task_type in ('order','priority','idea')),
  sort_order integer default 0,
  is_recurring boolean default false,
  recur_daily boolean default false,
  due_date date,
  telegram_remind boolean default false,
  last_reminded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Settings (key/value) — Telegram chat id etc.
create table os_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Income & Expenses
create table transactions (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('income','expense')),
  amount numeric(12,2) not null,
  description text,
  business_id uuid references businesses(id) on delete set null,
  category text,
  transaction_date date default current_date,
  is_unnecessary boolean default false,
  ai_analysis text,
  created_at timestamptz default now()
);

-- Debts
create table debts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  total_amount numeric(12,2) not null,
  remaining_amount numeric(12,2) not null,
  emi_monthly numeric(12,2),
  emi_covers_principal boolean default false,
  interest_rate numeric(5,2),
  description text,
  start_date date,
  end_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Subscriptions
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text default '📱',
  amount numeric(10,2) not null,
  billing_cycle text default 'monthly' check (billing_cycle in ('monthly','yearly','weekly')),
  next_due date,
  is_active boolean default true,
  category text,
  created_at timestamptz default now()
);

-- Seed: Businesses
insert into businesses (name, emoji, color) values
  ('Wander Breeze Exim', '🌿', '#10b981'),
  ('Elatz Wear It', '👕', '#8b5cf6'),
  ('Leafy Digital', '💻', '#3b82f6'),
  ('#WBE Fresh Produce', '🥭', '#f59e0b'),
  ('DriveX RC Garage', '🏎️', '#ef4444'),
  ('IBA Home Decor', '🖨️', '#06b6d4'),
  ('The Wedding Threads', '💍', '#ec4899');

-- Seed: Tasks for Wander Breeze Exim
insert into tasks (business_id, title, priority, task_type, is_recurring, recur_daily)
select id, t.title, t.priority::text, 'priority', true, true
from businesses, (values
  ('Importer finding and outreach', 'high'),
  ('Buyer follow-up emails', 'high'),
  ('Market research', 'medium')
) as t(title, priority)
where name = 'Wander Breeze Exim';

-- Seed: Tasks for #WBE Fresh Produce
insert into tasks (business_id, title, priority, task_type, is_recurring, recur_daily)
select id, t.title, t.priority::text, 'priority', true, true
from businesses, (values
  ('Supplier finding', 'high'),
  ('Product research', 'medium'),
  ('Marketing strategy', 'medium')
) as t(title, priority)
where name = '#WBE Fresh Produce';

-- Seed: Tasks for Elatz Wear It
insert into tasks (business_id, title, priority, task_type, is_recurring, recur_daily)
select id, t.title, t.priority::text, 'priority', true, false
from businesses, (values
  ('Onam design creation', 'urgent'),
  ('Mockup generation', 'medium'),
  ('Launch plan for Onam collection', 'high')
) as t(title, priority)
where name = 'Elatz Wear It';

-- Seed: Tasks for IBA Home Decor
insert into tasks (business_id, title, priority, task_type, is_recurring, recur_daily)
select id, t.title, t.priority::text, 'priority', true, false
from businesses, (values
  ('Product niche research', 'high'),
  ('3D model design', 'high'),
  ('Supplier research (printing)', 'medium'),
  ('Website development', 'medium'),
  ('Marketing research', 'medium')
) as t(title, priority)
where name = 'IBA Home Decor';

-- Seed: Tasks for Leafy Digital
insert into tasks (business_id, title, priority, task_type, is_recurring, recur_daily)
select id, t.title, t.priority::text, 'priority', true, true
from businesses, (values
  ('Lead generation', 'high'),
  ('Client outreach', 'high'),
  ('Content creation', 'medium'),
  ('LinkedIn marketing', 'medium'),
  ('SaaS product development', 'high')
) as t(title, priority)
where name = 'Leafy Digital';

-- Seed: Subscriptions
insert into subscriptions (name, emoji, amount, billing_cycle, next_due, category) values
  ('Netflix', '🎬', 649, 'monthly', current_date + 30, 'Entertainment'),
  ('Spotify', '🎵', 119, 'monthly', current_date + 30, 'Entertainment'),
  ('YouTube Premium', '▶️', 189, 'monthly', current_date + 30, 'Entertainment'),
  ('Claude Pro', '🤖', 2000, 'monthly', current_date + 30, 'AI Tools'),
  ('ChatGPT Plus', '💬', 1700, 'monthly', current_date + 30, 'AI Tools'),
  ('Canva Pro', '🎨', 499, 'monthly', current_date + 30, 'Design'),
  ('Google Workspace', '📧', 125, 'monthly', current_date + 30, 'Productivity');

-- RLS (permissive for single-user app)
alter table businesses enable row level security;
alter table tasks enable row level security;
alter table transactions enable row level security;
alter table debts enable row level security;
alter table subscriptions enable row level security;
alter table os_settings enable row level security;

create policy "Allow all" on businesses for all using (true) with check (true);
create policy "Allow all" on tasks for all using (true) with check (true);
create policy "Allow all" on transactions for all using (true) with check (true);
create policy "Allow all" on debts for all using (true) with check (true);
create policy "Allow all" on subscriptions for all using (true) with check (true);
create policy "Allow all" on os_settings for all using (true) with check (true);
