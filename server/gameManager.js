const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const games = new Map();

function createGame(host, options = {}) {
  const gameCode = uniqueGameCode();
  const game = {
    gameCode,
    mode: options.mode || "private",
    hostUserId: host.userId,
    status: "waiting",
    currentTurnUserId: null,
    players: [],
    deck: [],
    discardPile: [],
    melds: [],
    stockReshuffles: 0,
    targetScore: 100,
    startedAt: null,
    endedAt: null,
    handResult: null
  };

  games.set(gameCode, game);
  joinGame(gameCode, host, true);

  if (game.mode === "ai") {
    addBotPlayer(game, 1);
  }

  return game;
}

function joinGame(gameCode, player, forceHost = false) {
  const game = findGame(gameCode);
  const existingPlayer = game.players.find((item) => item.userId === player.userId);

  if (existingPlayer) {
    existingPlayer.isConnected = true;
    existingPlayer.email = player.email;
    existingPlayer.displayName = player.displayName;
    return game;
  }

  if (game.mode === "ai" && !forceHost) {
    throw new Error("AI games are single-player rooms.");
  }
  if (game.status !== "waiting") {
    throw new Error("This game has already started.");
  }
  if (game.players.length >= MAX_PLAYERS) {
    throw new Error("Basic Rummy supports up to 4 players.");
  }

  game.players.push(createPlayer(player, firstOpenSeat(game.players), forceHost || game.hostUserId === player.userId));
  game.players.sort((a, b) => a.seat - b.seat);
  return game;
}

function leaveGame(gameCode, userId) {
  const game = games.get(normalizeCode(gameCode));
  if (!game) return null;

  const player = game.players.find((item) => item.userId === userId);
  if (player) player.isConnected = false;
  return game;
}

function startGame(gameCode, hostUserId) {
  const game = findGame(gameCode);
  if (game.hostUserId !== hostUserId) throw new Error("Only the host can start this game.");
  if (game.status !== "waiting") throw new Error("This game is not waiting for players.");
  if (game.players.length < MIN_PLAYERS) throw new Error("At least 2 players are required.");

  resetHand(game);
  game.status = "playing";
  game.startedAt = new Date().toISOString();
  return game;
}

function startNextHand(gameCode, hostUserId) {
  const game = findGame(gameCode);
  if (game.hostUserId !== hostUserId) throw new Error("Only the host can start the next hand.");
  if (game.status !== "hand_finished" && game.status !== "stalemate") {
    throw new Error("The current hand is not finished.");
  }

  resetHand(game);
  game.status = "playing";
  game.startedAt = new Date().toISOString();
  game.endedAt = null;
  return game;
}

function drawCard(gameCode, userId, source) {
  const game = requirePlayingGame(gameCode, userId);
  const player = requireCurrentPlayer(game, userId);

  if (player.hasDrawn) throw new Error("Discard before drawing again.");

  let card;
  if (source === "discard") {
    card = game.discardPile.pop();
    if (!card) throw new Error("Discard pile is empty.");
    player.drawnFromDiscardCardId = card.id;
  } else {
    card = drawFromStock(game);
    player.drawnFromDiscardCardId = null;
  }

  player.hand.push(card);
  player.hasDrawn = true;
  return game;
}

function meldCards(gameCode, userId, cardIds) {
  const game = requirePlayingGame(gameCode, userId);
  const player = requireCurrentPlayer(game, userId);

  if (!player.hasDrawn) throw new Error("Draw before melding.");

  const cards = takeCards(player, cardIds);
  const validation = validateMeld(cards);
  if (!validation.isValid) {
    player.hand.push(...cards);
    throw new Error(validation.message);
  }

  game.melds.push({
    id: `meld-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: validation.type,
    cards: sortMeldCards(cards, validation.type),
    createdByUserId: userId
  });
  player.hasMelded = true;
  checkWentOut(game, player, false);
  return game;
}

function layoffCard(gameCode, userId, cardId, meldId) {
  const game = requirePlayingGame(gameCode, userId);
  const player = requireCurrentPlayer(game, userId);

  if (!player.hasDrawn) throw new Error("Draw before laying off.");

  const card = takeCards(player, [cardId])[0];
  const meld = meldId
    ? game.melds.find((item) => item.id === meldId)
    : game.melds.find((item) => canLayOff(item, card));

  if (!meld || !canLayOff(meld, card)) {
    player.hand.push(card);
    throw new Error("That card cannot be laid off on any current meld.");
  }

  meld.cards.push(card);
  meld.cards = sortMeldCards(meld.cards, meld.type);
  player.hasMelded = true;
  checkWentOut(game, player, false);
  return game;
}

function discardCard(gameCode, userId, cardId) {
  const game = requirePlayingGame(gameCode, userId);
  const player = requireCurrentPlayer(game, userId);

  if (!player.hasDrawn) throw new Error("Draw a card before discarding.");
  if (player.drawnFromDiscardCardId === cardId) {
    throw new Error("You cannot discard the same card you just drew from the discard pile.");
  }

  const [card] = takeCards(player, [cardId]);
  game.discardPile.push(card);
  player.hasDrawn = false;
  player.drawnFromDiscardCardId = null;

  if (checkWentOut(game, player, true)) return game;

  advanceTurn(game);
  return game;
}

function playBotTurn(gameCode) {
  const game = findGame(gameCode);
  if (game.status !== "playing") return null;

  const player = game.players.find((item) => item.userId === game.currentTurnUserId);
  if (!player?.isBot) return null;

  drawCard(gameCode, player.userId, "deck");
  const meld = findBestMeld(player.hand);
  if (meld) meldCards(gameCode, player.userId, meld.map((card) => card.id));
  if (game.status !== "playing") return game;

  const discard = chooseBotDiscard(player);
  discardCard(gameCode, player.userId, discard.id);
  return game;
}

function publicStateFor(gameCode, userId) {
  const game = findGame(gameCode);
  const currentPlayer = game.players.find((player) => player.userId === userId);

  return {
    gameCode: game.gameCode,
    mode: game.mode,
    hostUserId: game.hostUserId,
    status: game.status,
    currentTurnUserId: game.currentTurnUserId,
    deckCount: game.deck.length,
    discardTop: game.discardPile[game.discardPile.length - 1] || null,
    stockReshuffles: game.stockReshuffles,
    targetScore: game.targetScore,
    melds: game.melds,
    players: game.players.map((player) => ({
      userId: player.userId,
      email: player.email,
      displayName: player.displayName,
      seat: player.seat,
      score: player.score,
      isHost: player.isHost,
      isConnected: player.isConnected,
      isBot: Boolean(player.isBot),
      cardsCount: player.hand.length
    })),
    hand: currentPlayer?.hand || [],
    drawnThisTurn: Boolean(currentPlayer?.hasDrawn),
    handResult: game.handResult
  };
}

function getPlayerIds(gameCode) {
  return findGame(gameCode)
    .players
    .filter((player) => !player.isBot)
    .map((player) => player.userId);
}

function resetHand(game) {
  const deck = createDeck();
  const handSize = game.players.length === 2 ? 10 : 7;

  game.deck = deck;
  game.discardPile = [];
  game.melds = [];
  game.stockReshuffles = 0;
  game.handResult = null;
  game.targetScore = targetScoreFor(game.players.length);

  game.players.forEach((player) => {
    player.hand = [];
    player.hasDrawn = false;
    player.hasMelded = false;
    player.drawnFromDiscardCardId = null;
  });

  for (let round = 0; round < handSize; round += 1) {
    for (const player of game.players) {
      player.hand.push(game.deck.pop());
    }
  }

  game.discardPile.push(game.deck.pop());
  game.currentTurnUserId = game.players[0].userId;
}

function drawFromStock(game) {
  if (game.deck.length === 0) {
    recycleDiscardPile(game);
  }

  const card = game.deck.pop();
  if (!card) {
    finishStalemate(game);
    throw new Error("The hand ended in a stalemate.");
  }
  return card;
}

function recycleDiscardPile(game) {
  if (game.stockReshuffles >= 1 || game.discardPile.length <= 1) {
    finishStalemate(game);
    return;
  }

  const topDiscard = game.discardPile.pop();
  game.deck = shuffle(game.discardPile);
  game.discardPile = [topDiscard];
  game.stockReshuffles += 1;
}

function checkWentOut(game, player, endedByDiscard) {
  if (player.hand.length > 0) return false;

  const points = game.players
    .filter((item) => item.userId !== player.userId)
    .reduce((total, opponent) => total + handPoints(opponent.hand), 0);
  const rummyBonus = !player.hadPreviousMeldBeforeHand;
  const earned = rummyBonus ? points * 2 : points;

  player.score += earned;
  game.status = player.score >= game.targetScore ? "finished" : "hand_finished";
  game.endedAt = new Date().toISOString();
  game.handResult = {
    type: "win",
    winnerUserId: player.userId,
    winnerName: player.displayName,
    points,
    earned,
    rummyBonus,
    endedByDiscard
  };
  return true;
}

function finishStalemate(game) {
  game.status = "stalemate";
  game.endedAt = new Date().toISOString();
  game.handResult = {
    type: "stalemate",
    points: 0,
    earned: 0,
    rummyBonus: false
  };
}

function createPlayer(player, seat, isHost) {
  return {
    userId: player.userId,
    email: player.email,
    displayName: player.displayName || player.email,
    seat,
    score: 0,
    hand: [],
    isHost,
    isConnected: true,
    isBot: Boolean(player.isBot),
    hasDrawn: false,
    hasMelded: false,
    hadPreviousMeldBeforeHand: false,
    drawnFromDiscardCardId: null
  };
}

function validateMeld(cards) {
  if (cards.length < 3) return { isValid: false, message: "A meld needs at least 3 cards." };

  const sameRank = cards.every((card) => card.rank === cards[0].rank);
  const uniqueSuits = new Set(cards.map((card) => card.suit));
  if (sameRank && cards.length <= 4 && uniqueSuits.size === cards.length) {
    return { isValid: true, type: "set" };
  }

  const sameSuit = cards.every((card) => card.suit === cards[0].suit);
  const values = [...cards].map((card) => card.value).sort((a, b) => a - b);
  const consecutive = values.every((value, index) => index === 0 || value === values[index - 1] + 1);

  if (sameSuit && consecutive) return { isValid: true, type: "run" };
  return { isValid: false, message: "Melds must be a same-rank set or same-suit run." };
}

function canLayOff(meld, card) {
  if (meld.type === "set") {
    return meld.cards.length < 4 && meld.cards.every((item) => item.rank === card.rank);
  }

  const sameSuit = meld.cards.every((item) => item.suit === card.suit);
  if (!sameSuit) return false;

  const values = meld.cards.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return card.value === min - 1 || card.value === max + 1;
}

function takeCards(player, cardIds) {
  const cards = [];

  for (const cardId of cardIds) {
    const index = player.hand.findIndex((card) => card.id === cardId);
    if (index === -1) {
      player.hand.push(...cards);
      throw new Error("You cannot use a card you do not own.");
    }
    cards.push(player.hand.splice(index, 1)[0]);
  }

  return cards;
}

function findBestMeld(hand) {
  const byRank = groupBy(hand, (card) => card.rank);
  for (const cards of byRank.values()) {
    if (cards.length >= 3) return cards.slice(0, Math.min(cards.length, 4));
  }

  for (const suit of SUITS) {
    const cards = hand.filter((card) => card.suit === suit).sort((a, b) => a.value - b.value);
    for (let start = 0; start < cards.length; start += 1) {
      const run = [cards[start]];
      for (let index = start + 1; index < cards.length; index += 1) {
        const previous = run[run.length - 1];
        if (cards[index].value === previous.value + 1) run.push(cards[index]);
        if (run.length >= 3) return run;
      }
    }
  }

  return null;
}

function chooseBotDiscard(player) {
  return player.hand.reduce((worst, card) => {
    if (card.id === player.drawnFromDiscardCardId) return worst;
    return cardPointValue(card) >= cardPointValue(worst) ? card : worst;
  }, player.hand.find((card) => card.id !== player.drawnFromDiscardCardId) || player.hand[0]);
}

function sortMeldCards(cards, type) {
  if (type === "set") return [...cards].sort((a, b) => a.suit.localeCompare(b.suit));
  return [...cards].sort((a, b) => a.value - b.value);
}

function handPoints(cards) {
  return cards.reduce((total, card) => total + cardPointValue(card), 0);
}

function cardPointValue(card) {
  if (card.rank === "A") return 1;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return Number(card.rank);
}

function targetScoreFor(playerCount) {
  if (playerCount === 2) return 100;
  if (playerCount === 3) return 150;
  return 200;
}

function addBotPlayer(game, botNumber) {
  game.players.push(
    createPlayer(
      {
        userId: `${game.gameCode}-BOT-${botNumber}`,
        email: `ai${botNumber}@local.game`,
        displayName: botNumber === 1 ? "AI Player" : `AI Player ${botNumber}`,
        isBot: true
      },
      firstOpenSeat(game.players),
      false
    )
  );
  game.players.sort((a, b) => a.seat - b.seat);
}

function findGame(gameCode) {
  const game = games.get(normalizeCode(gameCode));
  if (!game) throw new Error("Game not found.");
  return game;
}

function requirePlayingGame(gameCode, userId) {
  const game = findGame(gameCode);
  if (game.status !== "playing") throw new Error("This hand is not currently playing.");
  if (!game.players.some((player) => player.userId === userId)) throw new Error("You are not in this game.");
  return game;
}

function requireCurrentPlayer(game, userId) {
  if (game.currentTurnUserId !== userId) throw new Error("It is not your turn.");

  const player = game.players.find((item) => item.userId === userId);
  if (!player) throw new Error("Player not found.");
  return player;
}

function advanceTurn(game) {
  const currentPlayer = game.players.find((player) => player.userId === game.currentTurnUserId);
  if (currentPlayer) currentPlayer.hadPreviousMeldBeforeHand = currentPlayer.hasMelded;

  const currentIndex = game.players.findIndex((player) => player.userId === game.currentTurnUserId);
  const nextIndex = (currentIndex + 1) % game.players.length;
  game.currentTurnUserId = game.players[nextIndex].userId;
}

function firstOpenSeat(players) {
  const taken = new Set(players.map((player) => player.seat));
  for (let seat = 1; seat <= MAX_PLAYERS; seat += 1) {
    if (!taken.has(seat)) return seat;
  }
  return players.length + 1;
}

function createDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        suit,
        rank,
        value: rankToValue(rank),
        id: `${suit}-${rank}`
      });
    }
  }
  return shuffle(cards);
}

function shuffle(cards) {
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

function groupBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, [...(map.get(key) || []), item]);
  }
  return map;
}

function uniqueGameCode() {
  let code = generateGameCode();
  while (games.has(code)) code = generateGameCode();
  return code;
}

function generateGameCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function normalizeCode(gameCode) {
  return String(gameCode || "").trim().toUpperCase();
}

module.exports = {
  createGame,
  joinGame,
  leaveGame,
  startGame,
  startNextHand,
  playBotTurn,
  drawCard,
  meldCards,
  layoffCard,
  discardCard,
  publicStateFor,
  getPlayerIds
};
