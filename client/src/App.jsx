import { useState, useEffect } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import Conference from "./Components/Conference.jsx";
import {
  selectIsConnectedToRoom,
  useHMSActions,
  useHMSStore,
} from "@100mslive/react-sdk";
import JoinRoom from "./Components/JoinRoom.jsx";
import Sidebar from "./Components/Sidebar.jsx";
import Output from "./Components/Output.jsx";

const socket = io("localhost:5000");

export default function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [code, setCode] = useState("//start code here");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState(`User typing : `);
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [output, setOutput] = useState("click on run to execute your code");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const hmsActions = useHMSActions();

  useEffect(() => {
    socket.on("authToken", async (token) => {
      await hmsActions.join({ userName, authToken: token.token.token });
    });

    socket.on("userJoined", (users) => {
      setJoined(true);
      setUsers(users);
    });

    socket.on("roomCode", (data) => {
      console.log("Received room code:", data.roomCode);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("outputUpdate", (newOutput) => {
      setOutput(newOutput);
    });

    socket.on("userTyping", (user) => {
      setTyping(`User typing : ${user}`);
      setTimeout(() => setTyping(`User typing : `), 1000);
    });

    socket.on("receivedMessage", ({ roomId, userName, message, time }) => {
      setMessageList((list) => [...list, { roomId, userName, message, time }]);
    });

    socket.on("userLeft", (user) => {
      setJoined(false);
      hmsActions.leave();
      setUsers((prevUsers) => prevUsers.filter((u) => u !== user));
      if (!user) {
        setMessageList([]);
      }
    });

    socket.on("joinError", (errorMessage) => {
      setUserName("");
      setRoomId("");
      alert(errorMessage);
    });

    socket.on("codeOutput", (res) => {
      setIsLoading(false);

      if (res.run.stderr) {
        setIsError(true);
      } else {
        setIsError(false);
      }
      setOutput(res.run.output);
      socket.emit("codeRunning", { roomId, isLoading: false });
      socket.emit("errorPresent", { roomId, isError });
    });

    socket.on("codeRunning", ({ isLoading }) => {
      setIsLoading(isLoading);
    });
    socket.on("errorUpdate", ({ isLoading }) => {
      setIsError(true);
    });

    return () => {
      socket.off("authToken");
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("outputUpdate");
      socket.off("userTyping");
      socket.off("receivedMessage");
      socket.off("userLeft");
      socket.off("joinError");
      socket.off("codeOutput");
      socket.off("codeRunning");
      socket.off("errorUpdate");
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
    if (!roomId || !userName) {
      alert("Please enter both room ID and username.");
      return;
    }

    if (userName.length > 10) {
      alert("Username must be less than 10 characters.");
      return;
    }

    if (roomId.length > 5) {
      alert("Room ID must be less than 5 characters.");
      return;
    }
    socket.emit("join", { roomId, userName });
  };

  const leaveRoom = () => {
    setRoomId("");
    setUserName("");
    setCode("//start code here");
    setUsers([]);
    setMessageList([]);
    setTyping("");
    setCurrentMessage("");
    setCode("");
    socket.emit("leaveRoom");
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

  const runCode = async () => {
    if (code) {
      socket.emit("codeRunning", { roomId, isLoading: true });
      setIsLoading(true);
      try {
        socket.emit("runCode", { code: code, roomId: roomId });
      } catch (error) {
        console.error("Error running code:", error);
      }
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
          className="editor"
          height={"70%"}
          defaultLanguage={"javascript"}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
          }}
        />
        <button className="run-button" onClick={runCode} disabled={isLoading}>
          {isLoading ? (
            <div className="spinner"></div>
          ) : (
            <span>&#9654;</span> // The play icon
          )}
        </button>

        <Output output={output} isError={isError}></Output>
      </div>
      <div className="video-container">
        <Conference />
      </div>
    </div>
  );
}
