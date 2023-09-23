const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const ngrok = require("ngrok");

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

io.on("connection", (socket) => {
  // idを返す
  socket.emit("id", socket.id);

  // 接続台数が2台になったらローディングをやめる
  if (io.engine.clientsCount == 2) {
    io.emit("loading", false);
  }

  // メッセージを受け取り、それを全ユーザーに返す
  socket.on("post-message", (req) => {
    io.emit("message", req);
    // TODO: 点数を行い、POST /chikuchikuにリクエストする
  });

  // 接続が切れた時にローディング状態にする
  socket.on("disconnect", (reason) => {
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
