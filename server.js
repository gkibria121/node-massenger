const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

// Use CORS middleware in Express
app.use(cors());

// To hold users' information
const socketsStatus = {};

io.on("connection", function (socket) {
  const socketId = socket.id;
  socketsStatus[socket.id] = {};

  console.log("connect");

  socket.on("voice", function (data) {
    if (data instanceof Buffer) {
      const base64Data = data.toString('base64');
      const audioData = `data:audio/ogg;base64,${base64Data}`;
      
      for (const id in socketsStatus) {
        if (id !== socketId && !socketsStatus[id].mute && socketsStatus[id].online) {
          socket.broadcast.to(id).emit("send", audioData);
        }
      }
    } else {
      console.error("Received data is not a Buffer:", data);
    }
  });

  socket.on("userInformation", function (data) {
    socketsStatus[socketId] = data;
    io.sockets.emit("usersUpdate", socketsStatus);
  });

  socket.on("disconnect", function () {
    delete socketsStatus[socketId];
  });
});

http.listen(3001, () => {
  console.log("The app is running on port 3001!");
});
