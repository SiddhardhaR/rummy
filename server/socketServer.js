require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const gameManager = require("./gameManager");

const port = Number(process.env.SOCKET_PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

const app = express();
app.use(cors({ origin: clientOrigin }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"]
  }
});

const socketsByUser = new Map();
const socketMeta = new Map();

io.on("connection", (socket) => {
  socket.on("create_game", (player) => {
    run(socket, () => {
      rememberSocket(player.userId, socket.id);
      const game = gameManager.createGame(player);
      rememberRoom(socket.id, player.userId, game.gameCode);
      socket.join(game.gameCode);
      socket.emit("game_created", { gameCode: game.gameCode });
      emitGameState(game.gameCode);
    });
  });

  socket.on("create_ai_game", (player) => {
    run(socket, () => {
      rememberSocket(player.userId, socket.id);
      const game = gameManager.createGame(player, { mode: "ai" });
      gameManager.startGame(game.gameCode, player.userId);
      rememberRoom(socket.id, player.userId, game.gameCode);
      socket.join(game.gameCode);
      socket.emit("game_created", { gameCode: game.gameCode });
      emitGameState(game.gameCode);
      scheduleBotTurn(game.gameCode);
    });
  });

  socket.on("join_game", ({ gameCode, ...player }) => {
    run(socket, () => {
      rememberSocket(player.userId, socket.id);
      const game = gameManager.joinGame(gameCode, player);
      rememberRoom(socket.id, player.userId, game.gameCode);
      socket.join(game.gameCode);
      socket.emit("joined_game", { gameCode: game.gameCode });
      io.to(game.gameCode).emit("player_joined", { userId: player.userId });
      emitGameState(game.gameCode);
    });
  });

  socket.on("leave_game", ({ gameCode, userId }) => {
    run(socket, () => {
      const game = gameManager.leaveGame(gameCode, userId);
      if (game) {
        io.to(game.gameCode).emit("player_left", { userId });
        emitGameState(game.gameCode);
      }
    });
  });

  socket.on("start_game", ({ gameCode, userId }) => {
    run(socket, () => {
      const game = gameManager.startGame(gameCode, userId);
      io.to(game.gameCode).emit("game_started");
      emitGameState(game.gameCode);
      scheduleBotTurn(game.gameCode);
    });
  });

  socket.on("next_hand", ({ gameCode, userId }) => {
    run(socket, () => {
      const game = gameManager.startNextHand(gameCode, userId);
      io.to(game.gameCode).emit("game_started");
      emitGameState(game.gameCode);
      scheduleBotTurn(game.gameCode);
    });
  });

  socket.on("draw_card", ({ gameCode, userId, source }) => {
    run(socket, () => {
      const game = gameManager.drawCard(gameCode, userId, source);
      io.to(game.gameCode).emit("card_drawn", { userId, source });
      emitGameState(game.gameCode);
    });
  });

  socket.on("discard_card", ({ gameCode, userId, cardId }) => {
    run(socket, () => {
      const game = gameManager.discardCard(gameCode, userId, cardId);
      io.to(game.gameCode).emit("card_discarded", { userId });
      io.to(game.gameCode).emit("turn_changed", { userId: game.currentTurnUserId });
      emitGameState(game.gameCode);
      scheduleBotTurn(game.gameCode);
    });
  });

  socket.on("meld_cards", ({ gameCode, userId, cardIds }) => {
    run(socket, () => {
      const game = gameManager.meldCards(gameCode, userId, cardIds);
      io.to(game.gameCode).emit("meld_created", { userId });
      emitGameState(game.gameCode);
    });
  });

  socket.on("layoff_card", ({ gameCode, userId, cardId, meldId }) => {
    run(socket, () => {
      const game = gameManager.layoffCard(gameCode, userId, cardId, meldId);
      io.to(game.gameCode).emit("card_laid_off", { userId });
      emitGameState(game.gameCode);
    });
  });

  socket.on("disconnect", () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;

    for (const gameCode of meta.gameCodes) {
      const game = gameManager.leaveGame(gameCode, meta.userId);
      if (game) {
        io.to(game.gameCode).emit("player_left", { userId: meta.userId });
        emitGameState(game.gameCode);
      }
    }
    if (socketsByUser.get(meta.userId) === socket.id) {
      socketsByUser.delete(meta.userId);
    }
    socketMeta.delete(socket.id);
  });
});

function rememberSocket(userId, socketId) {
  if (!userId) return;
  socketsByUser.set(userId, socketId);
}

function rememberRoom(socketId, userId, gameCode) {
  if (!userId || !gameCode) return;
  const existing = socketMeta.get(socketId) || { userId, gameCodes: new Set() };
  existing.userId = userId;
  existing.gameCodes.add(gameCode);
  socketMeta.set(socketId, existing);
}

function emitGameState(gameCode) {
  for (const userId of gameManager.getPlayerIds(gameCode)) {
    const socketId = socketsByUser.get(userId);
    if (socketId) {
      io.to(socketId).emit("game_state", gameManager.publicStateFor(gameCode, userId));
    }
  }
}

function scheduleBotTurn(gameCode) {
  setTimeout(() => {
    try {
      const game = gameManager.playBotTurn(gameCode);
      if (!game) return;

      io.to(game.gameCode).emit("card_drawn", { userId: game.currentTurnUserId, source: "deck" });
      io.to(game.gameCode).emit("card_discarded", { userId: game.currentTurnUserId });
      io.to(game.gameCode).emit("turn_changed", { userId: game.currentTurnUserId });
      emitGameState(game.gameCode);
      scheduleBotTurn(game.gameCode);
    } catch (error) {
      emitGameState(gameCode);
    }
  }, 900);
}

function run(socket, fn) {
  try {
    fn();
  } catch (error) {
    socket.emit("error_message", error.message || "Something went wrong.");
  }
}

server.listen(port, () => {
  console.log(`Socket.IO rummy server listening on ${port}`);
});
