"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GameLobby from "@/components/GameLobby";
import GameTable from "@/components/GameTable";
import { getCurrentUser } from "@/lib/auth";
import { upsertUserProfile } from "@/lib/db";
import { getSocket } from "@/lib/socket";

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const gameCode = String(params.gameId || "").toUpperCase();
  const [user, setUser] = useState(null);
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }
      await upsertUserProfile(currentUser);
      setUser(currentUser);
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    if (!user || !gameCode) return undefined;

    const socket = getSocket();
    const player = userPayload(user);
    socket.connect();
    socket.emit("join_game", { ...player, gameCode });

    socket.on("game_state", setGame);
    socket.on("error_message", (message) => setError(message));
    socket.on("joined_game", () => setError(""));

    return () => {
      socket.emit("leave_game", { gameCode, userId: user.id });
      socket.off("game_state");
      socket.off("error_message");
      socket.off("joined_game");
    };
  }, [gameCode, user]);

  function emit(action, payload = {}) {
    setError("");
    getSocket().emit(action, {
      gameCode,
      userId: user.id,
      ...payload
    });
  }

  if (!user || !game) {
    return <main className="grid min-h-screen place-items-center bg-[#f6f3ec] text-ink">Joining game...</main>;
  }

  if (game.status === "waiting") {
    return (
      <GameLobby
        game={game}
        user={user}
        error={error}
        onStart={() => emit("start_game")}
      />
    );
  }

  return (
    <GameTable
      game={game}
      user={user}
      error={error}
      onDraw={(source) => emit("draw_card", { source })}
      onDiscard={(cardId) => emit("discard_card", { cardId })}
      onMeld={(cardIds) => emit("meld_cards", { cardIds })}
      onLayoff={(cardId, meldId) => emit("layoff_card", { cardId, meldId })}
      onNextHand={() => emit("next_hand")}
    />
  );
}

function userPayload(user) {
  return {
    userId: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name || user.email.split("@")[0]
  };
}
