import { useState } from "react";

const JoinRoom = ({ joinRoom, setRoomId, setUserName, userName, roomId }) => {
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
          placeholder="Username"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <button type="button" onClick={joinRoom}>
          Join Room
        </button>
      </div>
    </div>
  );
};

export default JoinRoom;
