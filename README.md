# Private Rummy

A simple private Basic Rummy MVP built with Next.js, React, Tailwind CSS, Supabase Auth, PostgreSQL schema files, and a Socket.IO game server.

## What is included

- Email/password signup and login through Supabase Auth.
- Dashboard with create game and join game flows.
- One vs AI mode for instant solo play against a server-controlled bot.
- Unique 6-character uppercase private game IDs.
- Waiting lobby with host-only start and 2-4 player limits.
- Socket.IO game rooms for real-time updates.
- Server-owned Basic Rummy state with a 52-card deck, 10-card two-player deals, 7-card three/four-player deals, discard pile, melds, layoffs, turn order, scoring, Rummy bonus, and stalemate on second stock exhaustion.
- Per-player state filtering so each player only receives their own hand.
- Refresh/reconnect support by rejoining with the logged-in session and game ID.

## Setup

1. Install Node.js 18 or newer.
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` from `.env.example` and fill in Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
SOCKET_PORT=4000
CLIENT_ORIGIN=http://localhost:3000
```

4. Run `database/schema.sql` in the Supabase SQL editor.
5. Start both servers:

```bash
npm run dev:all
```

The Next.js app runs on `http://localhost:3000`; the Socket.IO server runs on `http://localhost:4000`.

## Notes

The Socket.IO game state is currently in memory for a fast MVP. For production, persist `games`, `game_players`, and `game_actions` from `server/gameManager.js` into PostgreSQL so games survive backend restarts and can scale across multiple server instances.
