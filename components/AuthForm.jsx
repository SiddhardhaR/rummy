"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginWithEmail, signUpWithEmail } from "@/lib/auth";

export default function AuthForm({ mode }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f3ec] px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-clay">Private Rummy</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">
            {isSignup ? "Create account" : "Log in"}
          </h1>
        </div>

        <div className="space-y-4">
          {isSignup && (
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Display name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-3 outline-none focus:border-felt"
                placeholder="Sidd"
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-3 outline-none focus:border-felt"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-3 outline-none focus:border-felt"
              placeholder="Minimum 6 characters"
            />
          </label>

          {isSignup && (
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Confirm password</span>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-3 outline-none focus:border-felt"
              />
            </label>
          )}
        </div>

        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-felt px-4 py-3 font-semibold text-white transition hover:bg-[#0f4634] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Please wait..." : isSignup ? "Create Account" : "Login"}
        </button>

        <p className="mt-5 text-center text-sm text-stone-600">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <Link className="font-semibold text-clay" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </form>
    </main>
  );
}
