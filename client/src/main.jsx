import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { HMSRoomProvider } from "@100mslive/react-sdk";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HMSRoomProvider>
      <App />
    </HMSRoomProvider>
  </StrictMode>
);
