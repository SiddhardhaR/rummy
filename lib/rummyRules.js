export function validateDeclaration(cards) {
  return {
    isValid: cards.length === 13,
    message:
      cards.length === 13
        ? "Declaration accepted for MVP review."
        : "A declaration needs exactly 13 cards."
  };
}

export function canStartGame(players) {
  return players.length >= 2 && players.length <= 6;
}
