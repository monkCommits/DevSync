// Sidebar.jsx
import React from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import Chat from "./Chat";

const Sidebar = ({
  roomId,
  copyRoomId,
  users,
  typing,
  leaveRoom,
  messageList,
  currentMessage,
  handleMessageChange,
  handleKeyPress,
  sendMessage,
  userName,
}) => {
  return (
    <div className="sidebar">
      <div className="room-info">
        <h2>Room Code : {roomId}</h2>
        <button onClick={copyRoomId} className="copy-button">
          Copy ID
        </button>
        <button className="leave-button" onClick={leaveRoom}>
          Leave Room
        </button>
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

      <Chat
        messageList={messageList}
        currentMessage={currentMessage}
        handleMessageChange={handleMessageChange}
        handleKeyPress={handleKeyPress}
        sendMessage={sendMessage}
        typing={typing}
        userName={userName}
      />
    </div>
  );
};

export default Sidebar;
