import { useState } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { useEffect } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import Conference from "./Components/Conference.jsx";
import Footer from "./Components/Footer";
import {
  selectIsConnectedToRoom,
  useHMSActions,
  useHMSStore,
} from "@100mslive/react-sdk";

const socket = io("http://localhost:5000/");

export default function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("//start code here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const hmsActions = useHMSActions();

  //as of now this works
  // hmsActions.join({
  //   userName,
  //   authToken:
  //     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoyLCJ0eXBlIjoiYXBwIiwiYXBwX2RhdGEiOm51bGwsImFjY2Vzc19rZXkiOiI2NzEwOTE3NzQ5NDRmMDY3MzEzYTdkNGIiLCJyb2xlIjoiaG9zdCIsInJvb21faWQiOiI2NzEwZjMyZDhjZWY5Y2EzMzU1YjQyNGIiLCJ1c2VyX2lkIjoiNDYzNmMzNjEtMzk3ZC00NjdkLTgyOTgtYzg3MTFjOTBjYTk1IiwiZXhwIjoxNzI5MzA3NDc4LCJqdGkiOiI2NzNmOTMwMC02OTE2LTRhYzMtOWUxZi02MTg4MmIwNGY1NTYiLCJpYXQiOjE3MjkyMjEwNzgsImlzcyI6IjY3MTA5MTc3NDk0NGYwNjczMTNhN2Q0OSIsIm5iZiI6MTcyOTIyMTA3OCwic3ViIjoiYXBpIn0.qhU06CAV_wXSj62KIPycS6t5o_0Pgl9lsR1ywwN7CkI",
  // });

  useEffect(() => {
    socket.on("authToken", async (token) => {
      console.log("auth token trigr");
      // token = JSON.parse(token);
      token = token.token.token;
      token = String(token);
      console.log(token);

      await hmsActions.join({
        userName,
        authToken: token,
      });
    });
  });

  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });
    socket.on("roomCode", (data) => {
      // setRoomCode(data.roomCode);
      console.log("Received room code:", data.roomCode);
    });
    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });
    socket.on("userTyping", (user) => {
      setTyping(`${user} is typing...`);
      setTimeout(() => setTyping(""), 1000);
    });
    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });
    socket.on("receivedMessage", ({ roomId, userName, message, time }) => {
      setMessageList((list) => [...list, { roomId, userName, message, time }]);
    });
    //temporary code - make it better
    socket.on("userLeft", () => {
      hmsActions.leave();
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("receivedMessage");
    };
  }, []);
  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    window.onunload = () => {
      if (isConnected) {
        hmsActions.leave();
      }
    };
  }, [hmsActions, isConnected]);

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
    setLanguage("javascript");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => {
      setCopySuccess("");
    }, 3000);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
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
        time:
          new Date(Date.now()).getHours() +
          ":" +
          new Date(Date.now()).getMinutes(),
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
      <div className="join-container">
        <div className="join-form">
          <h1>Join Code Room</h1>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            type="text"
            placeholder="username"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button type="button" onClick={joinRoom}>
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <h2>Code Room : {roomId}</h2>
          <button onClick={copyRoomId} className="copy-button">
            Copy ID
          </button>
          {copySuccess && <span className="copy-success">{copySuccess}</span>}
        </div>
        <h3>Users in Room</h3>
        <ul>
          <ScrollToBottom>
            {users.map((user, index) => (
              <li key={index}>{user}</li>
            ))}
          </ScrollToBottom>
        </ul>
        <p className="typing-indicator">{typing}</p>
        <select
          className="language-selector"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
        </select>
        <button className="leave-button" onClick={leaveRoom}>
          Leave Room
        </button>
        <div className="chat-window">
          <div className="chat-header">
            <p>Live Chat</p>
          </div>
          <div className="chat-body">
            <ScrollToBottom className="message-container">
              {messageList.map((messageContent) => {
                return (
                  <div
                    className="message"
                    id={userName === messageContent.userName ? "other" : "you"}
                  >
                    <div>
                      <div className="message-content">
                        <p>{messageContent.message}</p>
                      </div>
                      <div className="message-meta">
                        <p id="time">{messageContent.time}</p>
                        <p id="author">{messageContent.userName}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </ScrollToBottom>
          </div>

          <div className="chat-footer">
            <input
              type="text"
              placeholder="type your messages here..."
              onChange={handleMessageChange}
              value={currentMessage}
              onKeyDown={handleKeyPress}
            />
            <button onClick={sendMessage}>&#9658;</button>
          </div>
        </div>
      </div>

      <div className="editor-wrapper">
        <Editor
          height={"100%"}
          defaultLanguage={language}
          language={language}
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
          <Footer />
        </div>
      </div>
    </div>
  );
}
