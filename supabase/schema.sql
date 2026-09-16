-- SplitPay schema
-- Run this in the Supabase SQL editor (or `supabase db push` after linking).
--
-- Security model: this app has NO auth. The unguessable group slug is the
-- shared secret. All writes go through the SvelteKit server using the
-- SERVICE ROLE key, so we can safely leave RLS disabled on these tables.
-- If you ever expose these tables to the anon key, add RLS first.

create extension if not exists "pgcrypto";

create table if not exists groups (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    name text not null,
    currency text not null default 'USD',
    created_at timestamptz not null default now()
);

create table if not exists members (
    id uuid primary key default gen_random_uuid(),
    group_id uuid not null references groups(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now()
);
create index if not exists members_group_id_idx on members(group_id);

create table if not exists expenses (
    id uuid primary key default gen_random_uuid(),
    group_id uuid not null references groups(id) on delete cascade,
    description text not null,
    amount_cents bigint not null check (amount_cents > 0),
    paid_by uuid not null references members(id) on delete restrict,
    created_by uuid references members(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists expenses_group_id_idx on expenses(group_id);

create table if not exists expense_shares (
    expense_id uuid not null references expenses(id) on delete cascade,
    member_id uuid not null references members(id) on delete cascade,
    share_cents bigint not null check (share_cents >= 0),
    primary key (expense_id, member_id)
);
create index if not exists expense_shares_member_id_idx on expense_shares(member_id);
