import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5001");

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [chatPartner, setChatPartner] = useState(null); // Stores assigned user/agent
  const [isAgent, setIsAgent] = useState(false); // Track if current user is an agent
  const [isAgentOnline, setIsAgentOnline] = useState(false); // Track agent availability

  useEffect(() => {
    // Receive messages
    socket.on("receive_message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          from: data.from === socket.id ? "You" : isAgent ? "User" : "Agent",
          message: data.message,
        },
      ]);
    });

    // User connects to an agent
    socket.on("live_chat_connected", (data) => {
      console.log("Connected to agent:", data.agent_id);
      setChatPartner("Agent"); // Show "Agent" instead of ID
    });

    // Agent connects to a user
    socket.on("new_live_chat", (data) => {
      console.log("Connected to user:", data.user_id);
      setChatPartner("User"); // Show "User" instead of ID
    });

    // Show agent availability
    socket.on("agent_status", (data) => {
      console.log(`Agent ${data.agent_id} is now ${data.status}`);
      setIsAgentOnline(data.status === "online");
    });

    // Handle chat disconnection
    socket.on("chat_ended", () => {
      console.log("Chat ended");
      setChatPartner(null);
    });

    return () => {
      socket.off("receive_message");
      socket.off("live_chat_connected");
      socket.off("new_live_chat");
      socket.off("agent_status");
      socket.off("chat_ended");
    };
  }, []);

  const registerAgent = () => {
    socket.emit("register_agent");
    setIsAgent(true);
    console.log("Registered as agent");
  };

  const requestChat = () => {
    if (!isAgentOnline) {
      alert("No agents are online right now.");
      return;
    }
    socket.emit("request_live_chat");
    console.log("Requested live chat");
  };

  const sendMessage = () => {
    if (!chatPartner) {
      console.error("No chat partner assigned yet.");
      return;
    }
    socket.emit("send_message", { message });
    setMessages((prev) => [...prev, { from: "You", message }]);
    setMessage("");
  };

  return (
    <div>
      <h2>Live Chat</h2>
      {isAgent ? (
        <p>
          <strong>You are an Agent</strong>
        </p>
      ) : (
        <p>
          <strong>Agent Status:</strong>{" "}
          {isAgentOnline ? "🟢 Online" : "🔴 Offline"}
        </p>
      )}

      {!isAgent && <button onClick={requestChat}>Request Live Chat</button>}
      {isAgent && <button onClick={registerAgent}>Register as Agent</button>}

      <div>
        {messages.map((msg, i) => (
          <p key={i}>
            <strong>{msg.from}:</strong> {msg.message}
          </p>
        ))}
      </div>

      {chatPartner && (
        <>
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
          <button onClick={sendMessage}>Send</button>
        </>
      )}
    </div>
  );
}
