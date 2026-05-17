create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  game_code text not null unique,
  mode text not null default 'private' check (mode in ('private', 'ai')),
  host_user_id uuid not null references public.users(id),
  status text not null check (status in ('waiting', 'playing', 'hand_finished', 'finished', 'stalemate', 'cancelled')),
  current_turn_user_id uuid references public.users(id),
  deck jsonb not null default '[]'::jsonb,
  discard_pile jsonb not null default '[]'::jsonb,
  melds jsonb not null default '[]'::jsonb,
  stock_reshuffles int not null default 0,
  target_score int not null default 100,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.users(id),
  seat_number int not null,
  hand_cards jsonb not null default '[]'::jsonb,
  score int not null default 0,
  is_host boolean not null default false,
  is_connected boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (game_id, user_id),
  unique (game_id, seat_number)
);

create table if not exists public.game_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.users(id),
  action_type text not null check (
    action_type in ('join_game', 'start_game', 'draw_card', 'meld_cards', 'layoff_card', 'discard_card', 'win', 'stalemate')
  ),
  action_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_actions enable row level security;

create policy "Users can read their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can upsert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);
