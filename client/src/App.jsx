import { useState, useEffect } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import ScrollToBottom from "react-scroll-to-bottom";
import Conference from "./Components/Conference.jsx";
import {
  selectIsConnectedToRoom,
  useHMSActions,
  useHMSStore,
} from "@100mslive/react-sdk";
import JoinRoom from "./Components/JoinRoom.jsx";
import Sidebar from "./Components/Sidebar.jsx";

const socket = io("http://localhost:5000/");

export default function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [code, setCode] = useState("//start code here");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState(`User typing : `);
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const hmsActions = useHMSActions();

  useEffect(() => {
    socket.on("authToken", async (token) => {
      await hmsActions.join({ userName, authToken: token.token.token });
    });

    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("roomCode", (data) => {
      console.log("Received room code:", data.roomCode);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", (user) => {
      setTyping(`User typing : ${user}`);
      setTimeout(() => setTyping(`User typing : `), 1000);
    });

    socket.on("receivedMessage", ({ roomId, userName, message, time }) => {
      setMessageList((list) => [...list, { roomId, userName, message, time }]);
    });

    socket.on("userLeft", (user) => {
      hmsActions.leave();
      setUsers((prevUsers) => prevUsers.filter((u) => u !== user));
      if (!user) {
        setMessageList([]);
      }
    });

    return () => {
      socket.off("authToken");
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("receivedMessage");
      socket.off("userLeft");
    };
  }, [hmsActions, userName]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isConnected) {
        if (
          performance.navigation.type === performance.navigation.TYPE_RELOAD
        ) {
          console.log("Page is being reloaded");
        } else {
          console.log("Tab is being closed");
        }

        hmsActions.leave();
      }

      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hmsActions, isConnected]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleMessageChange = (e) => {
    setCurrentMessage(e.target.value);
  };

  const sendMessage = () => {
    if (currentMessage) {
      const messageData = {
        roomId,
        userName,
        message: currentMessage,
        time: new Date(Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setCurrentMessage("");
      socket.emit("sendMessage", messageData);
      setMessageList((list) => [...list, messageData]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  if (!joined) {
    return (
      <JoinRoom
        joinRoom={joinRoom}
        setRoomId={setRoomId}
        setUserName={setUserName}
        roomId={roomId}
        userName={userName}
      />
    );
  }

  return (
    <div className="editor-container">
      <Sidebar
        roomId={roomId}
        copyRoomId={copyRoomId}
        users={users}
        typing={typing}
        leaveRoom={leaveRoom}
        messageList={messageList}
        currentMessage={currentMessage}
        handleMessageChange={handleMessageChange}
        handleKeyPress={handleKeyPress}
        sendMessage={sendMessage}
        userName={userName}
      />
      <div className="editor-wrapper">
        <Editor
          height={"100%"}
          defaultLanguage={"javascript"}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
          }}
        />
      </div>
      <div className="video-container">
        <div className="App">
          <Conference />
        </div>
      </div>
    </div>
  );
}
