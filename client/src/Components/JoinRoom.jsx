import { useState } from "react";

const JoinRoom = ({
  joinRoom,
  setRoomId,
  setUserName,
  userName,
  roomId,
  error,
}) => {
  return (
    <div className="join-container">
      <div className="join-form">
        <h1>Join Room</h1>
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
          Join
        </button>

        {error && <span className="error-message">{error}</span>}
      </div>
    </div>
  );
};

export default JoinRoom;
