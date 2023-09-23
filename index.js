const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const ngrok = require("ngrok");
const axios = require("axios");

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

const playerList = {
  player1: "",
  player2: "",
};

io.on("connection", (socket) => {
  // idを返す
  socket.emit("id", socket.id);
  if (playerList.player1 == "") {
    playerList.player1 = socket.id;
  } else if (playerList.player2 == "") {
    playerList.player2 = socket.id;
  }

  // プレイヤーが揃ったらローディングをやめる
  if (playerList.player1 != "" && playerList.player2 != "") {
    io.emit("loading", false);
    // TODO: ポーリングを開始する GET /balloon/status
  }

  // メッセージを受け取り、それを全ユーザーに返す
  socket.on("post-message", (req) => {
    io.emit("message", req);
    // TODO: 点数を行い、POST /balloon/needleにリクエストする
  });

  // 接続が切れた時にローディング状態にする
  socket.on("disconnect", (reason) => {
    if (playerList.player1 == socket.id) {
      playerList.player1 = "";
    } else if (playerList.player2 == socket.id) {
      playerList.player2 = "";
    }

    if (io.engine.clientsCount - 1 == 2) {
      io.emit("loading", false);
    } else {
      io.emit("loading", true);
    }
  });
});

const port = 8080;

ngrok.connect(port).then((url) => {
  server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
    console.log(`Example app listening at ${url}`);
  });
});
