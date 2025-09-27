import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3002";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [emmiMessages, setEmmiMessages] = useState([]);
  const [currentEmmiMessage, setCurrentEmmiMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [userCount, setUserCount] = useState(0);

  const connectSocket = () => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnectionStatus("connecting");
    console.log(`Attempting to connect to chat server (attempt ${reconnectAttemptsRef.current + 1})`);

    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    // Initialize socket with retry configuration
    socketRef.current = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to chat server');
      setConnected(true);
      setConnectionStatus("connected");
      setError(null);
      reconnectAttemptsRef.current = 0;

      // Set username on connection
      socketRef.current.emit('set_username', { username });
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from chat server:', reason);
      setConnected(false);
      setConnectionStatus("disconnected");

      // Auto-reconnect unless manually disconnected
      if (reason !== 'io client disconnect' && isUsernameSet) {
        scheduleReconnect();
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus("error");
      setConnected(false);

      if (isUsernameSet) {
        scheduleReconnect();
      }
    });

    socketRef.current.on('chat_history', (messages) => {
      setChatMessages(messages);
    });

    socketRef.current.on('new_message', (message) => {
      // Only add non-Emmi messages to chat display
      if (!message.isEmmi) {
        setChatMessages(prev => [...prev, message]);
      }

      // If it's an Emmi message with audio, add to Emmi message queue
      if (message.isEmmi && message.audio) {
        setEmmiMessages(prev => [...prev, message]);
      }
    });

    socketRef.current.on('error_message', (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    socketRef.current.on('username_error', (data) => {
      setError(data.message);
      setIsUsernameSet(false);
      setTimeout(() => setError(null), 3000);
    });

    socketRef.current.on('user_count', (data) => {
      setUserCount(data.count);
    });
  };

  const scheduleReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setError("Connection lost. Please refresh the page.");
      setConnectionStatus("failed");
      return;
    }

    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current++;

    setConnectionStatus("reconnecting");
    setError(`Reconnecting in ${Math.ceil(delay / 1000)}s... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connectSocket();
    }, delay);
  };

  useEffect(() => {
    if (!isUsernameSet) {
      // Clean up connection when username is not set
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      setConnected(false);
      setConnectionStatus("disconnected");
      return;
    }

    // Connect when username is set
    connectSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isUsernameSet, username]);

  // Handle Emmi message queue (for audio playback)
  useEffect(() => {
    if (emmiMessages.length > 0 && !currentEmmiMessage) {
      setCurrentEmmiMessage(emmiMessages[0]);
    }
  }, [emmiMessages, currentEmmiMessage]);

  const sendMessage = (message) => {
    if (!connected || !socketRef.current || !isUsernameSet) {
      setError("Not connected to chat server");
      return;
    }

    if (!message.trim()) {
      return;
    }

    socketRef.current.emit('send_message', { message: message.trim() });
  };

  const setUserUsername = (newUsername) => {
    if (!newUsername.trim() || newUsername.length < 2 || newUsername.length > 20) {
      setError("Username must be 2-20 characters long");
      return false;
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
      setError("Username can only contain letters, numbers, underscore, and dash");
      return false;
    }

    setUsername(newUsername.trim());
    setIsUsernameSet(true);
    return true;
  };

  const onMessagePlayed = () => {
    setEmmiMessages(prev => prev.slice(1));
    setCurrentEmmiMessage(null);
  };

  // Manual reconnection function
  const reconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setError(null);
    connectSocket();
  };

  // Legacy chat function for backward compatibility (now uses real-time)
  const chat = (message) => {
    sendMessage(message);
  };

  return (
    <ChatContext.Provider
      value={{
        // Legacy support
        chat,
        message: currentEmmiMessage,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,

        // New real-time features
        chatMessages,
        sendMessage,
        connected,
        error,
        emmiMessages,
        currentEmmiMessage,

        // Connection management
        connectionStatus,
        reconnect,

        // Username features
        username,
        isUsernameSet,
        setUserUsername,

        // User count
        userCount
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
