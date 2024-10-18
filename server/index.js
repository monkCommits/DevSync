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
        name: `${roomId} Room`, // You can customize the room name based on the roomId
        description: `Room for ${userName}`,
        recording_info: { enabled: false }, // Enable recording if needed
      };

      const room = await hms.rooms.create(roomCreateOptions); // Create the room
      console.log("Room created:", room); // Log the created room details

      // Generate auth token
      const tokenConfig = {
        roomId: room.id, // Use the ID of the newly created room
        role: "host",
        userId: userName,
      }; // Use userName as userId or assign a unique ID

      const token = await hms.auth.getAuthToken(tokenConfig); // Generate token
      socket.emit("authToken", { token });
      console.log(userName);
    } catch (error) {
      console.error("Error creating room or generating token:", error);
      socket.emit("authError", "Could not create room or generate auth token"); // Notify client of error
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
const port = process.env.PORT || 5000;

const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

server.listen(port, () => {
  console.log(`server running on port ${port}`);
});
