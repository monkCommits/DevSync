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
    origin: "*",
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`user connected with id ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", async ({ roomId, userName }) => {
    currentRoom = roomId;
    currentUser = userName;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Set(),
        code: "//start code here",
        output: "click on run to execute your code",
        error: false,
      });
    }

    if (rooms.get(roomId).users.has(userName)) {
      socket.emit("joinError", "Username is already taken in this room.");
      return;
    }

    socket.join(roomId);
    rooms.get(roomId).users.add(userName);

    const room = rooms.get(roomId);

    io.to(roomId).emit("userJoined", Array.from(room.users));

    socket.emit("codeUpdate", room.code);
    socket.emit("outputUpdate", room.output);
    socket.emit("errorUpdate", room.error);

    try {
      const roomCreateOptions = {
        name: `${roomId} Room`,
        description: `Room for ${userName}`,
        recording_info: { enabled: false },
      };

      const createdRoom = await hms.rooms.create(roomCreateOptions);
      console.log("Room created:", createdRoom);

      const tokenConfig = {
        roomId: createdRoom.id,
        role: "host",
        userId: userName,
      };

      const token = await hms.auth.getAuthToken(tokenConfig);
      socket.emit("authToken", { token });
    } catch (error) {
      console.error("Error creating room or generating token:", error);
      socket.emit("authError", "Could not create room or generate auth token");
    }

    console.log(`user joined room ${roomId}`);
  });

  socket.on("codeChange", ({ roomId, code }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.code = code;

      socket.to(roomId).emit("codeUpdate", code);
    }
  });

  socket.on("runCode", async ({ code, roomId }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const response = await axios.post(
        "https://emkc.org/api/v2/piston/execute",
        {
          language: "js",
          version: "18.15.0",
          files: [
            {
              content: code,
            },
          ],
        }
      );
      room.output = response.data.run.output;
      io.to(roomId).emit("codeOutput", response.data);
    }
  });

  socket.on("leaveRoom", () => {
    if (currentRoom && currentUser) {
      const room = rooms.get(currentRoom);
      room.users.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(room.users));
      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
      if (room.users.size === 0) {
        room.code = "//start code here";
        room.output = "click on run to execute your code";
        room.error = false;
      }
    }

    socket.emit("userLeft");
  });

  socket.on("typing", ({ roomId, userName }) => {
    socket.emit("userTyping", userName);
    socket.to(roomId).emit("userTyping", userName);
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

  socket.on("codeRunning", ({ roomId, isLoading }) => {
    socket.to(roomId).emit("codeRunning", { isLoading });
  });
  socket.on("errorPresent", ({ roomId, isError }) => {
    const room = rooms.get(roomId);
    room.error = isError;
  });
});

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
