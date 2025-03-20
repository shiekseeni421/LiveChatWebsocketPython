import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5001");

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [chatPartner, setChatPartner] = useState(null); // Stores the other user's ID

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          from: data.from === socket.id ? "You" : "User",
          message: data.message,
        },
      ]);
    });

    socket.on("live_chat_connected", (data) => {
      console.log("Connected to agent:", data.agent_id);
      setChatPartner(data.agent_id); // Store agent ID for users
    });

    socket.on("new_live_chat", (data) => {
      console.log("Connected to user:", data.user_id);
      setChatPartner(data.user_id); // Store user ID for agents
    });

    return () => {
      socket.off("receive_message");
      socket.off("live_chat_connected");
      socket.off("new_live_chat");
    };
  }, []);

  const registerAgent = () => {
    socket.emit("register_agent");
    console.log("Registered as agent");
  };

  const requestChat = () => {
    socket.emit("request_live_chat");
    console.log("Requested live chat");
  };

  const sendMessage = () => {
    if (!chatPartner) {
      console.error("No chat partner assigned yet.");
      return;
    }
    socket.emit("send_message", { to: chatPartner, message });
    setMessages((prev) => [...prev, { from: "You", message }]); // Show sent message
    setMessage("");
  };

  return (
    <div>
      <h2>Live Chat</h2>


      
      <button onClick={registerAgent}>Register as Agent</button>
      <div>
        {messages.map((msg, i) => (
          <p key={i}>
            <strong>{msg.from}:</strong> {msg.message}
          </p>
        ))}
      </div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
