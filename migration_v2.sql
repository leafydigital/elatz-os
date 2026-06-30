-- ELATZ OS — Migration v2
-- SAFE TO RUN on your existing database. Does NOT drop any data.
-- Run this in Supabase SQL Editor.

-- 1. Task improvements: completed_at timestamp, task_type (order/priority/idea), manual sort order, telegram reminders
alter table tasks add column if not exists completed_at timestamptz;
alter table tasks add column if not exists task_type text default 'priority' check (task_type in ('order','priority','idea'));
alter table tasks add column if not exists sort_order integer default 0;
alter table tasks add column if not exists telegram_remind boolean default false;
alter table tasks add column if not exists last_reminded_at timestamptz;

-- Backfill sort_order based on current creation order, per business
with ranked as (
  select id, row_number() over (partition by business_id order by created_at) as rn
  from tasks
)
update tasks set sort_order = ranked.rn
from ranked where tasks.id = ranked.id and tasks.sort_order = 0;

-- 2. Settings table (key/value) — used for Telegram chat id etc.
create table if not exists os_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
alter table os_settings enable row level security;
drop policy if exists "Allow all" on os_settings;
create policy "Allow all" on os_settings for all using (true) with check (true);

-- 3. Update business list to the current 7 businesses.
-- This RENAMES matching old businesses where possible (keeps their tasks/transactions/history),
-- and inserts any that don't exist yet. It does NOT delete businesses not in this list —
-- if you truly want only these 7, archive/delete the extra ones yourself from the Manage Biz page.

-- Wander Breeze Exim (keep as is, just ensure exists)
insert into businesses (name, emoji, color)
select 'Wander Breeze Exim', '🌿', '#10b981'
where not exists (select 1 from businesses where name = 'Wander Breeze Exim');

-- Rename old "T-Shirt & Corporate Gifting" -> "Elatz Wear It" if present, else insert
update businesses set name = 'Elatz Wear It', emoji = '👕', color = '#8b5cf6'
where name in ('T-Shirt & Corporate Gifting', 'Wear It');
insert into businesses (name, emoji, color)
select 'Elatz Wear It', '👕', '#8b5cf6'
where not exists (select 1 from businesses where name = 'Elatz Wear It');

-- Leafy Digital (keep as is, just ensure exists)
insert into businesses (name, emoji, color)
select 'Leafy Digital', '💻', '#3b82f6'
where not exists (select 1 from businesses where name = 'Leafy Digital');

-- Rename old "WBE Fresh Fruits & Veg" -> "#WBE Fresh Produce" if present, else insert
update businesses set name = '#WBE Fresh Produce', emoji = '🥭', color = '#f59e0b'
where name in ('WBE Fresh Fruits & Veg', 'WBE Fresh Produce');
insert into businesses (name, emoji, color)
select '#WBE Fresh Produce', '🥭', '#f59e0b'
where not exists (select 1 from businesses where name = '#WBE Fresh Produce');

-- DriveX RC Garage (new)
insert into businesses (name, emoji, color)
select 'DriveX RC Garage', '🏎️', '#ef4444'
where not exists (select 1 from businesses where name = 'DriveX RC Garage');

-- Rename old "3D Print Dropshipping" -> "IBA Home Decor" if present, else insert
update businesses set name = 'IBA Home Decor', emoji = '🖨️', color = '#06b6d4'
where name in ('3D Print Dropshipping', '3D Dropshipping');
insert into businesses (name, emoji, color)
select 'IBA Home Decor', '🖨️', '#06b6d4'
where not exists (select 1 from businesses where name = 'IBA Home Decor');

-- THE WEDDING THREADS (new)
insert into businesses (name, emoji, color)
select 'The Wedding Threads', '💍', '#ec4899'
where not exists (select 1 from businesses where name = 'The Wedding Threads');
