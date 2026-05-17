const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function createDecks(deckCount = 2) {
  const cards = [];

  for (let deck = 1; deck <= deckCount; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          suit,
          rank,
          value: rankToValue(rank),
          id: `${suit}-${rank}-${deck}`
        });
      }
    }

    cards.push({
      suit: "joker",
      rank: "Joker",
      value: 0,
      id: `joker-red-${deck}`
    });
    cards.push({
      suit: "joker",
      rank: "Joker",
      value: 0,
      id: `joker-black-${deck}`
    });
  }

  return shuffle(cards);
}

export function shuffle(cards) {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rankToValue(rank) {
  if (rank === "A") return 1;
  if (rank === "J") return 11;
  if (rank === "Q") return 12;
  if (rank === "K") return 13;
  return Number(rank);
}

export function cardLabel(card) {
  if (!card) return "";
  if (card.suit === "joker") return "Joker";
  const suitSymbol = {
    hearts: "H",
    diamonds: "D",
    clubs: "C",
    spades: "S"
  }[card.suit];
  return `${card.rank}${suitSymbol}`;
}
