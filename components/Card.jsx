"use client";

import { cardLabel } from "@/lib/cards";

const colorBySuit = {
  hearts: "text-red-600",
  diamonds: "text-red-600",
  clubs: "text-stone-900",
  spades: "text-stone-900",
  joker: "text-purple-700"
};

export default function Card({ card, selected, onClick, compact = false, faceDown = false, label }) {
  if (faceDown) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative shrink-0 overflow-hidden rounded-md border border-gold/70 bg-[#17110d] shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition ${
          compact ? "h-20 w-14" : "h-28 w-20"
        } ${selected ? "ring-2 ring-gold" : ""}`}
      >
        <span className="absolute inset-1 rounded border border-gold/50" />
        <span className="absolute inset-3 rounded bg-[radial-gradient(circle,#d6a84f_1px,transparent_1px)] [background-size:8px_8px] opacity-60" />
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs font-black uppercase tracking-widest text-gold">
          {label || "Rummy"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex shrink-0 flex-col justify-between overflow-hidden rounded-md border bg-[#fffdf8] shadow-[0_10px_22px_rgba(0,0,0,0.22)] transition ${
        compact ? "h-20 w-14 p-2" : "h-28 w-20 p-2.5"
      } ${selected ? "border-gold ring-2 ring-gold" : "border-[#d7c7a4] hover:-translate-y-1"}`}
    >
      <span className="pointer-events-none absolute inset-1 rounded border border-[#eadbb8]" />
      <span className={`text-left font-bold ${compact ? "text-sm" : "text-base"} ${colorBySuit[card?.suit]}`}>
        {cardLabel(card)}
      </span>
      <span className={`text-center ${compact ? "text-xl" : "text-3xl"} ${colorBySuit[card?.suit]}`}>
        {card?.suit === "hearts" ? "♥" : card?.suit === "diamonds" ? "♦" : card?.suit === "clubs" ? "♣" : card?.suit === "spades" ? "♠" : "★"}
      </span>
    </button>
  );
}
