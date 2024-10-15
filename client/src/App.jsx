import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const App = () => {
  const [joined, setJoined] = useState(false);
  if (!joined) {
    return <div>App not joined</div>;
  }
  return <div>User joined</div>;
};

export default App;
