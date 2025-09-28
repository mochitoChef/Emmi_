import { useRef, useEffect, useState } from "react";
import { useChat } from "../hooks/useChat";

// Custom hook for fetching crypto prices
const useCryptoPrices = () => {
  const [prices, setPrices] = useState({ bitcoin: null, solana: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana&vs_currencies=usd',
          {
            headers: {
              'x-cg-demo-api-key': 'CG-XGemofkznKFqAzzz97y6BZtA'
            }
          }
        );
        const data = await response.json();
        setPrices({
          bitcoin: data.bitcoin?.usd,
          solana: data.solana?.usd
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch crypto prices:', error);
        setLoading(false);
      }
    };

    fetchPrices();
    // Update prices every 2 minutes
    const interval = setInterval(fetchPrices, 120000);

    return () => clearInterval(interval);
  }, []);

  return { prices, loading };
};

const ChatMessage = ({ message }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.isSystem) {
    return (
      <div className="text-xs text-gray-400 italic py-1">
        {message.message}
      </div>
    );
  }

  return (
    <div className={`py-1 px-2 rounded ${message.isEmmi ? 'bg-pink-900 bg-opacity-30' : ''}`}>
      <span className="text-xs text-gray-400 mr-2">{formatTime(message.timestamp)}</span>
      <span className={`font-semibold mr-2 ${message.isEmmi ? 'text-pink-400' : 'text-blue-400'}`}>
        {message.username}:
      </span>
      <span className="text-white">{message.message}</span>
    </div>
  );
};

const UsernameSetup = ({ setUserUsername, error }) => {
  const [usernameInput, setUsernameInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setUserUsername(usernameInput);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-black bg-opacity-90 backdrop-blur-md p-8 rounded-lg border border-pink-500 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-pink-400 mb-4 text-center">Choose Your Username</h2>
        <p className="text-gray-300 text-sm mb-6 text-center">
          Enter a username to join Emmi's chat room
        </p>

        {error && (
          <div className="mb-4 text-center">
            <span className="text-xs px-3 py-2 rounded text-red-400 bg-red-900 bg-opacity-50">
              {error}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Enter username (2-20 characters)"
            className="w-full bg-gray-800 text-white placeholder:text-gray-400 p-3 rounded border border-gray-600 focus:border-pink-500 focus:outline-none mb-4"
            maxLength={20}
            autoFocus
          />
          <button
            type="submit"
            disabled={!usernameInput.trim()}
            className={`w-full bg-pink-500 hover:bg-pink-600 text-white p-3 rounded font-semibold transition-colors ${
              !usernameInput.trim() ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Join Chat
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-400 text-center">
          <p>• Letters, numbers, underscore, and dash only</p>
          <p>• 2-20 characters long</p>
        </div>
      </div>
    </div>
  );
};

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const chatContainer = useRef();
  const { prices, loading: pricesLoading } = useCryptoPrices();
  const {
    chat,
    loading,
    cameraZoomed,
    setCameraZoomed,
    message,
    chatMessages,
    sendMessage,
    connected,
    error,
    username,
    isUsernameSet,
    setUserUsername,
    connectionStatus,
    reconnect,
    userCount,
    socket
  } = useChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainer.current) {
      chatContainer.current.scrollTop = chatContainer.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    const text = input.current.value;
    if (text.trim() && connected) {
      sendMessage(text);
      input.current.value = "";
    }
  };
  if (hidden) {
    return null;
  }

  // Show username setup if not set
  if (!isUsernameSet) {
    return <UsernameSetup setUserUsername={setUserUsername} error={error} />;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        <div className="w-full backdrop-blur-md bg-gradient-to-r from-black via-pink-900 to-black bg-opacity-80 p-4 border-b border-pink-500 shadow-lg">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            {/* Left side - Logo/Brand & Prices */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="font-black text-xl text-pink-400 leading-tight">$EMMI</h1>
                  <p className="text-xs text-pink-300 opacity-80">Virtual Girlfriend AI</p>
                </div>
              </div>

              {/* Crypto Prices */}
              <div className="hidden md:flex items-center space-x-3 text-xs">
                <div className="bg-pink-900 bg-opacity-50 px-2 py-1 rounded">
                  <span className="text-pink-300 font-medium">BTC:</span>
                  <span className="text-white ml-1">
                    {pricesLoading ? '...' : prices.bitcoin ? `$${prices.bitcoin.toLocaleString()}` : 'N/A'}
                  </span>
                </div>
                <div className="bg-cyan-900 bg-opacity-50 px-2 py-1 rounded">
                  <span className="text-cyan-300 font-medium">SOL:</span>
                  <span className="text-white ml-1">
                    {pricesLoading ? '...' : prices.solana ? `$${prices.solana.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Center - Main title */}
            <div className="flex-1 text-center px-4">
              <h1 className="font-black text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 animate-pulse">
                Live Chat Experience
              </h1>
              <div className="flex items-center justify-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-cyan-300 font-medium">LIVE</span>
                <span className="text-xs text-white/70">• {userCount} viewer{userCount !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Right side - Call to action */}
            <div className="text-right">
              <div className="hidden sm:block space-y-1">
                <p className="text-sm font-bold text-pink-400">Follow & Trade</p>
                <div className="flex flex-col space-y-1">
                  <a
                    href="https://pump.fun/board"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-block text-xs text-pink-300 bg-pink-900 bg-opacity-50 hover:bg-pink-800 hover:bg-opacity-70 px-2 py-1 rounded transition-all duration-200 hover:scale-105"
                  >
                    💎 Pump.Fun
                  </a>
                  <a
                    href="https://x.com/Emmiversee"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-block text-xs text-blue-300 bg-blue-900 bg-opacity-50 hover:bg-blue-800 hover:bg-opacity-70 px-2 py-1 rounded transition-all duration-200 hover:scale-105"
                  >
                    🐦 @Emmiversee
                  </a>
                </div>
              </div>
              <div className="sm:hidden flex space-x-2">
                <a
                  href="https://pump.fun/board"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto block"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                    <span className="text-white text-xs font-bold">💎</span>
                  </div>
                </a>
                <a
                  href="https://x.com/Emmiversee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto block"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                    <span className="text-white text-xs font-bold">🐦</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col items-end justify-center gap-4">
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
          >
            {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              const body = document.querySelector("body");
              if (body.classList.contains("greenScreen")) {
                body.classList.remove("greenScreen");
              } else {
                body.classList.add("greenScreen");
              }
            }}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
        </div>
        <div className="pointer-events-auto max-w-md w-full mx-auto">
          {/* Connection Status */}
          <div className="mb-2 text-center">
            <span className={`text-xs px-2 py-1 rounded ${
              connected ? 'text-green-400 bg-green-900 bg-opacity-50' :
              connectionStatus === 'connecting' ? 'text-yellow-400 bg-yellow-900 bg-opacity-50' :
              connectionStatus === 'reconnecting' ? 'text-orange-400 bg-orange-900 bg-opacity-50' :
              'text-red-400 bg-red-900 bg-opacity-50'
            }`}>
              {connected ? `🟢 Live Chat - ${username}` :
               connectionStatus === 'connecting' ? '🟡 Connecting...' :
               connectionStatus === 'reconnecting' ? '🟠 Reconnecting...' :
               connectionStatus === 'failed' ? '🔴 Connection Failed' :
               '🔴 Disconnected'}
            </span>
            {(connectionStatus === 'failed' || connectionStatus === 'error') && (
              <button
                onClick={reconnect}
                className="ml-2 text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Retry
              </button>
            )}
          </div>

          {/* Error Messages */}
          {error && (
            <div className="mb-2 text-center">
              <span className="text-xs px-2 py-1 rounded text-red-400 bg-red-900 bg-opacity-50">
                {error}
              </span>
            </div>
          )}

          {/* Chat Messages Area */}
          <div
            ref={chatContainer}
            className="bg-black bg-opacity-70 backdrop-blur-md rounded-t-md h-48 overflow-y-auto p-2 text-sm"
          >
            {chatMessages.length === 0 ? (
              <div className="text-gray-400 text-center text-xs py-4">
                Welcome to Emmi's live chat! Type @emmi to get her attention.
              </div>
            ) : (
              chatMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))
            )}
          </div>

          {/* Chat Input */}
          <div className="flex items-center bg-black bg-opacity-70 backdrop-blur-md rounded-b-md">
            <input
              className="flex-1 bg-transparent text-white placeholder:text-gray-400 p-3 rounded-bl-md focus:outline-none"
              placeholder={connected ? "Type a message... (@emmi to get her attention)" : "Connecting..."}
              ref={input}
              disabled={!connected}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
            />
            <button
              disabled={!connected}
              onClick={handleSendMessage}
              className={`bg-pink-500 hover:bg-pink-600 text-white p-3 px-6 font-semibold rounded-br-md transition-colors ${
                !connected ? "cursor-not-allowed opacity-30" : ""
              }`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
