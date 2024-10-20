import express from "express";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import HMS from "@100mslive/server-sdk";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const hms = new HMS.SDK(process.env.HMS_SDK_KEY, process.env.HMS_SDK_SECRET);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Change this to your frontend URL in production
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`user connected with id ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", async ({ roomId, userName }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
    }

    currentRoom = roomId;
    currentUser = userName;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(userName);
    io.to(roomId).emit("userJoined", Array.from(rooms.get(currentRoom)));

    try {
      const roomCreateOptions = {
        name: `${roomId} Room`,
        description: `Room for ${userName}`,
        recording_info: { enabled: false },
      };

      const room = await hms.rooms.create(roomCreateOptions);
      console.log("Room created:", room);

      const tokenConfig = {
        roomId: room.id,
        role: "host",
        userId: userName,
      };

      const token = await hms.auth.getAuthToken(tokenConfig);
      socket.emit("authToken", { token });
      console.log(userName);
    } catch (error) {
      console.error("Error creating room or generating token:", error);
      socket.emit("authError", "Could not create room or generate auth token");
    }

    console.log(`user joined room ${roomId}`);
  });

  socket.on("codeChange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("leaveRoom", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
      socket.emit("userLeft");
    }
  });

  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
    }
    console.log(`user disconnected`);
  });

  socket.on("sendMessage", ({ roomId, userName, message, time }) => {
    socket
      .to(roomId)
      .emit("receivedMessage", { roomId, userName, message, time });
  });
});

//
const url = `https://devsync-m54y.onrender.com`;
const interval = 30000;

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      console.log(
        `Reloaded at ${new Date().toISOString()}: Status Code ${
          response.status
        }`
      );
    })
    .catch((error) => {
      console.error(
        `Error reloading at ${new Date().toISOString()}:`,
        error.message
      );
    });
}

setInterval(reloadWebsite, interval);

const port = process.env.PORT || 5000;

const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

server.listen(port, () => {
  console.log(`server running on port ${port}`);
});
