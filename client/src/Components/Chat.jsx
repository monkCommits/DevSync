import ScrollToBottom from "react-scroll-to-bottom";

const Chat = ({
  messageList,
  currentMessage,
  handleMessageChange,
  handleKeyPress,
  sendMessage,
  typing,
  userName,
}) => {
  return (
    <div className="chat-window">
      <div className="chat-header">
        <p>Live Chat</p>
      </div>
      <div className="chat-body">
        <ScrollToBottom className="message-container">
          {messageList.map((messageContent, index) => (
            <div
              key={index}
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
          ))}
        </ScrollToBottom>
      </div>

      <div className="chat-footer">
        <input
          type="text"
          placeholder="Type your messages here..."
          onChange={handleMessageChange}
          value={currentMessage}
          onKeyDown={handleKeyPress}
        />
        <button onClick={sendMessage}>&#9658;</button>
      </div>
    </div>
  );
};

export default Chat;
