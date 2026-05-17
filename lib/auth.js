"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabaseConfig =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes("placeholder") &&
  supabaseAnonKey !== "placeholder-key";

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

export async function signUpWithEmail(email, password, displayName) {
  if (!hasSupabaseConfig) {
    return localSignUp(email, password, displayName);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split("@")[0]
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function loginWithEmail(email, password) {
  if (!hasSupabaseConfig) {
    return localLogin(email, password);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  if (!hasSupabaseConfig) {
    localStorage.removeItem("rummy_current_user");
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  if (!hasSupabaseConfig) {
    return readCurrentLocalUser();
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export function isSupabaseConfigured() {
  return hasSupabaseConfig;
}

function localSignUp(email, password, displayName) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readLocalUsers();

  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    password,
    user_metadata: {
      display_name: displayName || normalizedEmail.split("@")[0]
    }
  };

  users.push(user);
  writeLocalUsers(users);
  writeCurrentLocalUser(user);
  return { user: publicLocalUser(user) };
}

function localLogin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = readLocalUsers().find((item) => item.email === normalizedEmail);

  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.");
  }

  writeCurrentLocalUser(user);
  return { user: publicLocalUser(user) };
}

function readCurrentLocalUser() {
  const rawUser = localStorage.getItem("rummy_current_user");
  return rawUser ? JSON.parse(rawUser) : null;
}

function writeCurrentLocalUser(user) {
  localStorage.setItem("rummy_current_user", JSON.stringify(publicLocalUser(user)));
}

function readLocalUsers() {
  const rawUsers = localStorage.getItem("rummy_local_users");
  return rawUsers ? JSON.parse(rawUsers) : [];
}

function writeLocalUsers(users) {
  localStorage.setItem("rummy_local_users", JSON.stringify(users));
}

function publicLocalUser(user) {
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {}
  };
}
