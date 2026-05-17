"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, LogOut, Plus, Users } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { upsertUserProfile } from "@/lib/db";
import { getSocket } from "@/lib/socket";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }
      await upsertUserProfile(currentUser);
      setUser(currentUser);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    socket.on("game_created", ({ gameCode: createdCode }) => {
      router.push(`/game?gameId=${createdCode}`);
    });
    socket.on("joined_game", ({ gameCode: joinedCode }) => {
      router.push(`/game?gameId=${joinedCode}`);
    });
    socket.on("error_message", (message) => setError(message));

    return () => {
      socket.off("game_created");
      socket.off("joined_game");
      socket.off("error_message");
    };
  }, [router]);

  function userPayload() {
    return {
      userId: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name || user.email.split("@")[0]
    };
  }

  function createGame() {
    setError("");
    getSocket().emit("create_game", userPayload());
  }

  function createAiGame() {
    setError("");
    getSocket().emit("create_ai_game", userPayload());
  }

  function joinGame(event) {
    event.preventDefault();
    setError("");
    getSocket().emit("join_game", {
      ...userPayload(),
      gameCode: joinCode.trim().toUpperCase()
    });
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[#f6f3ec] text-ink">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-clay">Private Rummy</p>
            <h1 className="text-3xl font-black text-ink">Dashboard</h1>
            <p className="mt-1 text-stone-600">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 font-semibold text-ink"
          >
            <LogOut size={18} /> Logout
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-md bg-[#e7f1ec] p-2 text-felt"><Plus size={24} /></div>
              <div>
                <h2 className="text-xl font-bold text-ink">Create Game</h2>
                <p className="text-sm text-stone-600">Host a Basic Rummy room for 2-4 players.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={createGame}
              className="w-full rounded-md bg-felt px-4 py-3 font-semibold text-white hover:bg-[#0f4634]"
            >
              Create Game
            </button>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-md bg-[#ece8ff] p-2 text-[#5944a8]"><Bot size={24} /></div>
              <div>
                <h2 className="text-xl font-bold text-ink">Play vs AI</h2>
                <p className="text-sm text-stone-600">Start a 1 vs AI table instantly.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={createAiGame}
              className="w-full rounded-md bg-[#5944a8] px-4 py-3 font-semibold text-white hover:bg-[#49358e]"
            >
              One vs AI
            </button>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-md bg-[#f8eadf] p-2 text-clay"><Users size={24} /></div>
              <div>
                <h2 className="text-xl font-bold text-ink">Join Game</h2>
                <p className="text-sm text-stone-600">Enter the 6-character game ID.</p>
              </div>
            </div>
            <form onSubmit={joinGame} className="flex flex-col gap-3 sm:flex-row">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                maxLength={6}
                required
                className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-3 text-lg font-black uppercase tracking-widest outline-none focus:border-felt"
                placeholder="RMY482"
              />
              <button type="submit" className="rounded-md bg-clay px-5 py-3 font-semibold text-white">
                Join
              </button>
            </form>
          </section>
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </main>
  );
}
