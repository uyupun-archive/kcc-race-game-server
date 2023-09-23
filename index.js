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
  console.log("a user connected");

  socket.emit("id", socket.id);
  console.log(`connectedClients: ${io.engine.clientsCount}`);
  if (io.engine.clientsCount == 2) {
    io.emit("loading", false);
  }

  socket.on("post-message", (req) => {
    io.emit("message", req);
  });

  socket.on("disconnect", (reason) => {
    console.log("User disconnected with socket ID:", socket.id);
    console.log(`connectedClients: ${io.engine.clientsCount}`);
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
