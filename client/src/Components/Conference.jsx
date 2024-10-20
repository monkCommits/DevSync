import { selectPeers, useHMSStore, useAVToggle } from "@100mslive/react-sdk";
import Peer from "./Peer";
import ScrollToBottom from "react-scroll-to-bottom";

const Conference = () => {
  const peers = useHMSStore(selectPeers);
  const { isLocalAudioEnabled, toggleAudio, isLocalVideoEnabled, toggleVideo } =
    useAVToggle();
  return (
    <>
      <div className="conference-section">
        <h2>Conference</h2>
        <div className="peers-container-wrapper">
          <ScrollToBottom>
            <div className="peers-container">
              {peers.map((peer) => (
                <Peer key={peer.id} peer={peer}></Peer>
              ))}
            </div>
          </ScrollToBottom>
        </div>
      </div>
      <div className="control-bar">
        <button className="btn-control" onClick={toggleAudio}>
          {isLocalAudioEnabled ? "Mute" : "Unmute"}
        </button>
        <button className="btn-control" onClick={toggleVideo}>
          {isLocalVideoEnabled ? "Hide" : "Unhide"}
        </button>
      </div>
    </>
  );
};
export default Conference;
