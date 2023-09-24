const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const ngrok = require("ngrok");
const axios = require("axios");
require("dotenv").config();
const https = require("https");

// 自己署名証明書エラーを無視するAgentを作成
const agent = new https.Agent({
  rejectUnauthorized: false,
});

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

const pollExternalServer = async () => {
  try {
    const res = await axios.get(
      `${process.env.UYUNPUNION_URL}/balloon/status`,
      {
        httpsAgent: agent,
        headers: {
          "UYUNPUNION-TOKEN": process.env.UYUNPUNION_TOKEN,
        },
      }
    );
    const data = res.data;
    if (data.balloon_1) {
      io.to(playerList.player1).emit("winner", true);
      io.to(playerList.player2).emit("winner", false);
      clearInterval(pollingInterval);
    } else if (data.balloon_2) {
      io.to(playerList.player2).emit("winner", true);
      io.to(playerList.player1).emit("winner", false);
      clearInterval(pollingInterval);
    }
  } catch (error) {
    console.error("Error polling external server:", error);
  }
};

let pollingInterval;

const sendMessageAndPower = async (data) => {
  try {
    const res = await axios.get(
      `${process.env.TEXT_EVALUATOR_URL}/text-evaluate?text=${data.message}`,
      {
        httpsAgent: agent,
      }
    );
    const power = res.data.score;
    const balloon_id = playerList.player1 == data.id ? 1 : 2;
    console.log(`power: ${power}`);
    console.log(`balloon_id: ${balloon_id}`);

    await axios.post(
      `${process.env.UYUNPUNION_URL}/balloon/needle`,
      {
        balloon_id: balloon_id,
        power: power === 0 ? 1 : power,
      },
      {
        httpsAgent: agent,
        headers: {
          "UYUNPUNION-TOKEN": process.env.UYUNPUNION_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("成功です！");
  } catch (error) {
    console.error("Error:", error);
  }
};

io.on("connection", (socket) => {
  // idを返す
  socket.emit("id", socket.id);
  if (playerList.player1 == "") {
    playerList.player1 = socket.id;
  } else if (playerList.player2 == "") {
    playerList.player2 = socket.id;
  }

  console.log(playerList);

  // プレイヤーが揃ったらローディングをやめ、ポーリングを開始する
  if (playerList.player1 != "" && playerList.player2 != "") {
    console.log("プレイヤーが揃いました！");
    io.emit("loading", false);
    // pollingInterval = setInterval(pollExternalServer, 5000);
  }

  // メッセージを受け取り、それを全ユーザーに返す
  socket.on("post-message", (req) => {
    io.emit("message", req);
    sendMessageAndPower(req);
  });

  // 接続が切れた時にローディング状態にする
  socket.on("disconnect", (reason) => {
    if (playerList.player1 == socket.id) {
      playerList.player1 = "";
    } else if (playerList.player2 == socket.id) {
      playerList.player2 = "";
    }

    if (playerList.player1 != "" && playerList.player2 != "") {
      io.emit("loading", false);
    } else {
      io.emit("loading", true);
      clearInterval(pollingInterval);
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
