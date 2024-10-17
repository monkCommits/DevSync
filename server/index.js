import express from "express";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import bodyParser from "body-parser";

const MANAGEMENT_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MjkxNDQ3NDAsImV4cCI6MTcyOTc0OTU0MCwianRpIjoiZjIwZWU0NzQtMWJkMC00YjkyLWEwMjQtOWZjZTRhYzNhNmZhIiwidHlwZSI6Im1hbmFnZW1lbnQiLCJ2ZXJzaW9uIjoyLCJuYmYiOjE3MjkxNDQ3NDAsImFjY2Vzc19rZXkiOiI2NzEwOTE3NzQ5NDRmMDY3MzEzYTdkNGIifQ.G9eJkTTYU7CqecFKo0iI3_fSLPOnIiKo5uMyXXf0O6c";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.use(bodyParser.json());

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`user connected with id ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ roomId, userName }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom).delete(currentUser);
      //below even should be 'userLeft' and data should be currentUser
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
    console.log(rooms);

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

// Function to create room codes
const createRoomCodes = async (roomId) => {
  try {
    const response = await axios.post(
      `https://api.100ms.live/v2/room-codes/room/${roomId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error creating room codes:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

app.post("/create-room", async (req, res) => {
  const { name, description, template_id } = req.body;

  const data = {
    name,
    description,
    template_id,
  };

  try {
    // Step 1: Create the room
    const roomResponse = await axios.post(
      "https://api.100ms.live/v2/rooms",
      data,
      {
        headers: {
          Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const roomId = roomResponse.data.id;

    // Step 2: Create room codes for the newly created room
    const roomCodes = await createRoomCodes(roomId);

    res.status(200).json({
      room: roomResponse.data,
      roomCodes,
    });
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data,
      });
    } else {
      res.status(500).json({
        error: "An error occurred while creating the room or room codes.",
      });
    }
  }
});

const port = process.env.PORT || 5000;

server.listen(port, () => {
  console.log(`server running on port ${port}`);
});
