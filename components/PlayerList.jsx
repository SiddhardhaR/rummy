"use client";

export default function PlayerList({ players = [], currentTurnUserId }) {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.userId}
          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
            currentTurnUserId === player.userId ? "border-gold bg-[#fff8e7]" : "border-stone-200 bg-white"
          }`}
        >
          <div>
            <p className="font-semibold text-ink">
              Seat {player.seat}: {player.displayName || player.email}
            </p>
            <p className="text-xs text-stone-500">
              {player.isBot ? "AI" : player.isHost ? "Host" : "Player"} · {player.isConnected ? "Connected" : "Disconnected"}
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
            {player.score ?? 0} pts · {player.cardsCount ?? 0}
          </span>
        </div>
      ))}
    </div>
  );
}
