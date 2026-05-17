"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "./Card";

export default function GameTable({ game, user, onDraw, onDiscard, onMeld, onLayoff, onNextHand, error }) {
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [handOrder, setHandOrder] = useState([]);
  const [draggedCardId, setDraggedCardId] = useState("");
  const myTurn = game?.currentTurnUserId === user?.id;
  const isHost = game?.hostUserId === user?.id;
  const canPlayTurn = game?.status === "playing";
  const selectedCardId = selectedCardIds[0] || "";
  const selectedCard = useMemo(
    () => game?.hand?.find((card) => card.id === selectedCardId),
    [game?.hand, selectedCardId]
  );
  const orderedHand = useMemo(() => {
    const hand = game?.hand || [];
    const cardsById = new Map(hand.map((card) => [card.id, card]));
    const ordered = handOrder.map((id) => cardsById.get(id)).filter(Boolean);
    const missing = hand.filter((card) => !handOrder.includes(card.id));
    return [...ordered, ...missing];
  }, [game?.hand, handOrder]);
  const me = game?.players?.find((player) => player.userId === user?.id);
  const opponents = (game?.players || []).filter((player) => player.userId !== user?.id);

  useEffect(() => {
    setHandOrder((currentOrder) => {
      const handIds = (game?.hand || []).map((card) => card.id);
      const existing = currentOrder.filter((id) => handIds.includes(id));
      const added = handIds.filter((id) => !existing.includes(id));
      return [...existing, ...added];
    });
  }, [game?.hand]);

  function toggleCard(cardId) {
    setSelectedCardIds((currentIds) =>
      currentIds.includes(cardId)
        ? currentIds.filter((id) => id !== cardId)
        : [...currentIds, cardId]
    );
  }

  function clearSelection() {
    setSelectedCardIds([]);
  }

  function moveCardToIndex(cardId, targetIndex) {
    setHandOrder((currentOrder) => {
      const currentIds = orderedHand.map((card) => card.id);
      const baseOrder = currentOrder.length ? currentOrder : currentIds;
      const withoutCard = baseOrder.filter((id) => id !== cardId);
      const nextOrder = [...withoutCard];
      nextOrder.splice(targetIndex, 0, cardId);
      return nextOrder;
    });
  }

  function handleDrop(event, targetIndex) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain") || draggedCardId;
    if (!cardId) return;
    moveCardToIndex(cardId, targetIndex);
    setDraggedCardId("");
  }

  return (
    <main className="min-h-screen bg-[#120b08] text-[#1d1b15]">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#8c6529] bg-[#1a120e] px-3 py-2 text-sm text-[#f6df9b] shadow-sm">
        <h1 className="mr-2 text-2xl font-black tracking-wide text-[#f6d36b]">CASINO RUMMY</h1>
        <button className="font-bold text-[#1f5d3a]" type="button" onClick={() => window.location.reload()}>
          New Game
        </button>
        <span>|</span>
        <span className="font-semibold">Rules</span>
        <span>|</span>
        <span className="font-semibold">Options</span>
        <span>|</span>
        <span className="font-semibold">{game?.mode === "ai" ? "One vs AI" : "Multiplayer"}</span>
        <span className="ml-auto rounded bg-[#f6d36b] px-2 py-1 font-bold text-[#1a120e]">Code {game?.gameCode}</span>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-45px)] max-w-7xl flex-col px-2 py-3 sm:px-4">
        <div className="grid min-h-[28rem] flex-1 grid-cols-[7rem_1fr_7rem] grid-rows-[6rem_1fr_7rem] gap-2 sm:grid-cols-[10rem_1fr_10rem]">
          <Seat player={opponents[1]} position="top" activeUserId={game?.currentTurnUserId} />
          <div className="col-start-2 flex items-start justify-center">
            <Seat player={opponents[0]} position="top" activeUserId={game?.currentTurnUserId} />
          </div>
          <Seat player={opponents[2]} position="top" activeUserId={game?.currentTurnUserId} />

          <div className="col-start-1 row-start-2 flex items-center justify-center">
            <Seat player={opponents[3]} position="side" activeUserId={game?.currentTurnUserId} />
          </div>

          <div className="relative col-start-2 row-start-2 overflow-hidden rounded-[2.4rem] border-[12px] border-[#9e7233] bg-[#135c3d] shadow-[inset_0_0_90px_rgba(0,0,0,0.45),0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-3 rounded-[1.7rem] border border-[#f6d36b]/35" />
            <div className="pointer-events-none absolute inset-8 rounded-[1.2rem] border border-white/10" />
            <div className="absolute inset-x-4 top-4 flex items-center justify-center gap-4">
              <DeckButton
                disabled={!canPlayTurn || !myTurn || game?.drawnThisTurn}
                count={game?.deckCount || 0}
                onClick={() => onDraw("deck")}
              />
              <button
                type="button"
                disabled={!canPlayTurn || !myTurn || game?.drawnThisTurn || !game?.discardTop}
                onClick={() => onDraw("discard")}
                className="rounded-md bg-[#f7ecd0] px-3 py-2 shadow-md disabled:opacity-60"
              >
                {game?.discardTop ? <Card card={game.discardTop} compact /> : <span className="font-bold">Discard</span>}
              </button>
            </div>

            <div className="flex h-full items-center justify-center px-4 pt-24">
              <div className="w-full max-w-3xl rounded-lg border border-[#f6d36b]/40 bg-[#f7ecd0]/95 p-3 shadow-md">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-black">Melds</h2>
                  <span className="text-xs font-bold">
                    Target {game?.targetScore || 100} · Stock {game?.stockReshuffles || 0}/1
                  </span>
                </div>
                {game?.melds?.length ? (
                  <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
                    {game.melds.map((meld) => (
                      <button
                        type="button"
                        key={meld.id}
                        onClick={() => selectedCard && onLayoff(selectedCard.id, meld.id)}
                        className="rounded border border-[#d8c492] bg-white p-2 text-left"
                      >
                        <p className="mb-1 text-xs font-bold uppercase text-[#6e5b34]">{meld.type}</p>
                        <div className="flex flex-wrap gap-1">
                          {meld.cards.map((card) => (
                            <Card key={card.id} card={card} compact />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm font-semibold text-[#6a6048]">No melds on the table yet.</p>
                )}
              </div>
            </div>

            <div className="absolute inset-x-4 bottom-4 text-center">
              <StatusText game={game} myTurn={myTurn} />
            </div>
          </div>

          <div className="col-start-3 row-start-2 flex items-center justify-center">
            <ScoreBox players={game?.players || []} />
          </div>

          <div className="col-span-3 row-start-3 flex items-end justify-center">
            <Seat player={me} position="bottom" activeUserId={game?.currentTurnUserId} isYou />
          </div>
        </div>

        {error && <p className="mt-2 rounded bg-[#ffe3e3] px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}

        {game?.handResult && (
          <div className="mt-2 rounded border border-[#b08b4f] bg-[#f4f0dd] p-3 shadow">
            <p className="font-black">
              {game.handResult.type === "stalemate" ? "Stalemate" : `${game.handResult.winnerName} wins this hand`}
            </p>
            <p className="text-sm">
              {game.handResult.type === "stalemate"
                ? "No points awarded."
                : `${game.handResult.earned} points${game.handResult.rummyBonus ? " with Rummy bonus" : ""}.`}
            </p>
            {isHost && (game.status === "hand_finished" || game.status === "stalemate") && (
              <button type="button" onClick={onNextHand} className="mt-2 rounded bg-[#2f8b57] px-4 py-2 font-bold text-white">
                Play another hand
              </button>
            )}
          </div>
        )}

        <div className="mt-2 rounded-t-xl border border-[#8c6529] bg-[#1a120e] p-2 text-[#f7ecd0] shadow-lg">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canPlayTurn || !myTurn || !game?.drawnThisTurn || selectedCardIds.length < 3}
              onClick={() => {
                onMeld(selectedCardIds);
                clearSelection();
              }}
              className="rounded bg-[#2f8b57] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Meld
            </button>
            <button
              type="button"
              disabled={!canPlayTurn || !myTurn || !game?.drawnThisTurn || selectedCardIds.length !== 1}
              onClick={() => {
                onLayoff(selectedCardId);
                clearSelection();
              }}
              className="rounded bg-[#2f8b57] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Lay off
            </button>
            <button
              type="button"
              disabled={!canPlayTurn || !myTurn || !game?.drawnThisTurn || !selectedCard}
              onClick={() => {
                onDiscard(selectedCardId);
                clearSelection();
              }}
              className="rounded bg-[#b34b33] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Discard
            </button>
            <span className="ml-auto text-sm font-bold">Your hand: {game?.hand?.length || 0}</span>
          </div>
          <div className="flex min-h-32 gap-2 overflow-x-auto pb-2">
            <DropSlot onDrop={(event) => handleDrop(event, 0)} />
            {orderedHand.map((card) => (
              <div key={card.id} className="flex items-stretch gap-2">
                <div
                  draggable
                  onDragStart={(event) => {
                    setDraggedCardId(card.id);
                    event.dataTransfer.setData("text/plain", card.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDraggedCardId("")}
                  className={draggedCardId === card.id ? "opacity-40" : ""}
                >
                  <Card
                    card={card}
                    selected={selectedCardIds.includes(card.id)}
                    onClick={() => toggleCard(card.id)}
                  />
                </div>
                <DropSlot onDrop={(event) => handleDrop(event, orderedHand.findIndex((item) => item.id === card.id) + 1)} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Seat({ player, activeUserId, isYou }) {
  if (!player) return <div />;

  return (
    <div className={`min-w-24 rounded-lg border bg-[#f4f0dd] p-2 text-center shadow ${activeUserId === player.userId ? "border-[#f9d66b] ring-2 ring-[#f9d66b]" : "border-[#cdbb88]"}`}>
      <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-full bg-[#e4d2a2] text-xl font-black text-[#2b6b45]">
        {(player.displayName || player.email || "?").slice(0, 1).toUpperCase()}
      </div>
      <p className="truncate text-sm font-black">{isYou ? "You" : player.displayName || player.email}</p>
      <p className="text-xs font-semibold text-[#6a6048]">{player.score || 0} pts · {player.cardsCount || 0} cards</p>
    </div>
  );
}

function DeckButton({ disabled, count, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-2 rounded-md bg-[#f4f0dd] px-3 py-2 font-bold shadow-md disabled:opacity-60"
    >
      <Card faceDown compact label="Deck" />
      <span>{count}</span>
    </button>
  );
}

function DropSlot({ onDrop }) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="min-h-28 w-3 shrink-0 rounded-full border border-transparent transition hover:border-[#f6d36b] hover:bg-[#f6d36b]/30"
    />
  );
}

function StatusText({ game, myTurn }) {
  const text =
    game?.status === "playing"
      ? myTurn
        ? game?.drawnThisTurn
          ? "Meld/Lay off or discard"
          : "Your turn: draw a card"
        : "Waiting for opponent"
      : "Hand complete";

  return <span className="rounded-full bg-[#f4f0dd] px-4 py-2 text-sm font-black shadow">{text}</span>;
}

function ScoreBox({ players }) {
  return (
    <div className="rounded-lg border border-[#cdbb88] bg-[#f4f0dd] p-2 shadow">
      <p className="mb-2 text-center text-sm font-black">Score</p>
      <div className="space-y-1 text-xs font-semibold">
        {players.map((player) => (
          <div key={player.userId} className="flex justify-between gap-2">
            <span className="max-w-20 truncate">{player.displayName || player.email}</span>
            <span>{player.score || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
