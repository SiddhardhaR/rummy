"use client";

import PlayerList from "./PlayerList";

export default function GameLobby({ game, user, onStart, error }) {
  const isHost = game?.hostUserId === user?.id;
  const canStart = isHost && game?.players?.length >= 2;

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-clay">Game ID</p>
            <h1 className="mt-1 text-4xl font-black tracking-wide text-ink">{game?.gameCode}</h1>
            <p className="mt-1 text-sm font-semibold text-stone-600">
              {game?.mode === "ai" ? "One vs AI" : "Private multiplayer"}
            </p>
          </div>
          <div className="rounded-md bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-700">
            Players {game?.players?.length || 0}/{game?.mode === "ai" ? 2 : 4}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-ink">Lobby</h2>
          <PlayerList players={game?.players || []} />
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="button"
          disabled={!canStart}
          onClick={onStart}
          className="mt-6 w-full rounded-md bg-felt px-4 py-3 font-semibold text-white transition hover:bg-[#0f4634] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isHost ? "Start Game" : "Waiting for host"}
        </button>

        {isHost && game?.players?.length < 2 && (
          <p className="mt-3 text-sm text-stone-600">At least 2 players are needed to start.</p>
        )}
      </div>
    </section>
  );
}
