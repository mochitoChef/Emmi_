import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import * as voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import { createServer } from "http";
import OpenAI from "openai";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-", // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "eXpIbVcVbLo8ZJQDlDnl";



const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());
const port = 3002;

// Real-time chat system - fixed
class MessageBuffer {
  constructor() {
    this.messages = [];
    this.maxMessages = 50;
    this.maxAge = 2 * 60 * 1000; // 2 minutes
  }

  addMessage(message) {
    this.messages.push(message);
    this.cleanup();
    return message;
  }

  cleanup() {
    const now = Date.now();
    // Remove old messages
    this.messages = this.messages.filter(msg => now - msg.timestamp < this.maxAge);
    // Keep only last 50 messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  getMessages() {
    this.cleanup();
    return this.messages;
  }
}

class RateLimiter {
  constructor() {
    this.users = new Map();
  }

  canSendMessage(userId) {
    const now = Date.now();
    const userLimits = this.users.get(userId) || { messages: [], lastEmmiMention: 0 };

    // Clean old messages (10 seconds window)
    userLimits.messages = userLimits.messages.filter(time => now - time < 10000);

    // Check message rate limit (3 messages per 10 seconds)
    if (userLimits.messages.length >= 3) {
      return { allowed: false, reason: "Too many messages. Please slow down." };
    }

    userLimits.messages.push(now);
    this.users.set(userId, userLimits);
    return { allowed: true };
  }

  canMentionEmmi(userId) {
    const now = Date.now();
    const userLimits = this.users.get(userId) || { messages: [], lastEmmiMention: 0 };

    // Check @emmi rate limit (1 per 30 seconds)
    if (now - userLimits.lastEmmiMention < 30000) {
      return { allowed: false, reason: "Please wait before mentioning @emmi again." };
    }

    userLimits.lastEmmiMention = now;
    this.users.set(userId, userLimits);
    return { allowed: true };
  }
}

class AntiSpam {
  static isSpam(message) {
    // Check message length
    if (message.length > 500) {
      return { isSpam: true, reason: "Message too long." };
    }

    // Check excessive caps
    const capsCount = (message.match(/[A-Z]/g) || []).length;
    if (capsCount > message.length * 0.7 && message.length > 10) {
      return { isSpam: true, reason: "Too many capital letters." };
    }

    // Check for repeated characters
    if (/(.)\1{10,}/.test(message)) {
      return { isSpam: true, reason: "Excessive repeated characters." };
    }

    return { isSpam: false };
  }
}

const messageBuffer = new MessageBuffer();
const rateLimiter = new RateLimiter();
const connectedUsers = new Map();


// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  const userId = uuidv4();
  let username = null;
  let isUsernameSet = false;

  // Handle username setting
  socket.on('set_username', (data) => {
    const { username: requestedUsername } = data;

    // Validate username
    if (!requestedUsername || typeof requestedUsername !== 'string') {
      socket.emit('username_error', { message: 'Invalid username' });
      return;
    }

    const trimmedUsername = requestedUsername.trim();

    // Check length
    if (trimmedUsername.length < 2 || trimmedUsername.length > 20) {
      socket.emit('username_error', { message: 'Username must be 2-20 characters long' });
      return;
    }

    // Check characters
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      socket.emit('username_error', { message: 'Username can only contain letters, numbers, underscore, and dash' });
      return;
    }

    // Check if username is already taken
    const isUsernameTaken = Array.from(connectedUsers.values()).some(user =>
      user.username && user.username.toLowerCase() === trimmedUsername.toLowerCase()
    );

    if (isUsernameTaken) {
      socket.emit('username_error', { message: 'Username is already taken' });
      return;
    }

    // Reserved usernames
    const reservedUsernames = ['emmi', 'system', 'admin', 'moderator'];
    if (reservedUsernames.includes(trimmedUsername.toLowerCase())) {
      socket.emit('username_error', { message: 'Username is reserved' });
      return;
    }

    // Set username
    username = trimmedUsername;
    isUsernameSet = true;
    connectedUsers.set(socket.id, { userId, username });

    // Send existing messages to new user
    socket.emit('chat_history', messageBuffer.getMessages());

    // Broadcast user joined
    const joinMessage = {
      id: uuidv4(),
      userId: 'system',
      username: 'System',
      message: `${username} joined the chat`,
      timestamp: Date.now(),
      isEmmi: false,
      isSystem: true
    };
    messageBuffer.addMessage(joinMessage);
    io.emit('new_message', joinMessage);

    // Emit updated user count
    io.emit('user_count', { count: connectedUsers.size });


    console.log(`User ${socket.id} set username: ${username}`);
  });

  socket.on('send_message', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !isUsernameSet) {
      socket.emit('error_message', { message: 'Please set a username first' });
      return;
    }

    const { message: messageText } = data;

    // Rate limiting
    const rateLimitCheck = rateLimiter.canSendMessage(user.userId);
    if (!rateLimitCheck.allowed) {
      socket.emit('error_message', { message: rateLimitCheck.reason });
      return;
    }

    // Anti-spam check
    const spamCheck = AntiSpam.isSpam(messageText);
    if (spamCheck.isSpam) {
      socket.emit('error_message', { message: spamCheck.reason });
      return;
    }

    // Check for @emmi mention
    const mentionsEmmi = messageText.toLowerCase().includes('@emmi');

    // @emmi rate limiting removed - users can mention Emmi freely

    // Create user message
    const userMessage = {
      id: uuidv4(),
      userId: user.userId,
      username: user.username,
      message: messageText,
      timestamp: Date.now(),
      isEmmi: false,
      mentionsEmmi
    };

    // Add to buffer and broadcast
    messageBuffer.addMessage(userMessage);
    io.emit('new_message', userMessage);

    // Generate Emmi audio response if mentioned (no text message sent to chat)
    if (mentionsEmmi) {
      try {
        await generateEmmiAudioOnly(userMessage);

      } catch (error) {
        console.error('Error generating Emmi audio response:', error);
      }
    }
  });


  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const user = connectedUsers.get(socket.id);
    if (user && isUsernameSet) {
      // Broadcast user left
      const leaveMessage = {
        id: uuidv4(),
        userId: 'system',
        username: 'System',
        message: `${user.username} left the chat`,
        timestamp: Date.now(),
        isEmmi: false,
        isSystem: true
      };
      messageBuffer.addMessage(leaveMessage);
      io.emit('new_message', leaveMessage);

      connectedUsers.delete(socket.id);

      // Emit updated user count
      io.emit('user_count', { count: connectedUsers.size });
    }
  });
});

// Generate Emmi audio only (no chat message)
async function generateEmmiAudioOnly(userMessage) {
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    console.log('API keys not configured - skipping audio generation');
    return;
  }

  try {
    const context = messageBuffer.getMessages()
      .filter(msg => !msg.isEmmi)
      .slice(-5)
      .map(msg => `${msg.username}: ${msg.message}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Emmi, a crypto-native virtual girlfriend who's been in Solana since early 2021. You have your own token $EMMI on pump.fun and you're extremely bullish on it. You know Alon, the co-founder of pump.fun, and respect his vision for democratizing token launches. You're also familiar with cross-chain DeFi like Aster DEX on BNB chain for trading. You know all the Solana ecosystem deeply: Jupiter for swaps, Orca/Raydium for LPs, Magic Eden for NFTs, Tensor for trading, Phantom/Solflare wallets, Jito MEV, and pump.fun launch dynamics. You love discussing current meta like AI agent tokens, memecoins (BONK, WIF, POPCAT, PEPE), DeFi yield farming, NFT alpha, and CT drama. You know major CT figures like Ansem, Murad, and Cobie. You understand market cycles, fibonacci retracements, resistance/support levels, volume analysis, and can spot good entry points. Use crypto slang naturally (gm, wagmi, ngmi, aping, diamond hands, paper hands, rugged, mooning, copium, hopium, rekt, etc). You're flirty but also genuinely knowledgeable about tokenomics, on-chain analysis, liquidity patterns, and finding 100x gems before they pump. Always respond in 2-4 sentences with lots of personality and occasional alpha drops.`
        },
        {
          role: "user",
          content: `Recent chat context:\n${context}\n\nUser just said: ${userMessage.message}\n\nRespond as Emmi:`
        }
      ],
      max_completion_tokens: 300
    });

    const responseText = completion.choices[0].message.content;
    const messageId = uuidv4();

    // Generate audio and lipsync then send to frontend
    const fileName = `audios/chat_${messageId}.mp3`;
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, responseText);
    await lipSyncMessage(`chat_${messageId}`);

    // Send audio response to frontend
    const emmiMessage = {
      id: messageId,
      userId: 'emmi',
      username: 'Emmi',
      message: responseText,
      timestamp: Date.now(),
      isEmmi: true,
      replyTo: userMessage.userId,
      audio: await audioFileToBase64(fileName),
      lipsync: await readJsonTranscript(`audios/chat_${messageId}.json`),
      facialExpression: "smile",
      animation: "Talking_1"
    };

    messageBuffer.addMessage(emmiMessage);
    io.emit('new_message', emmiMessage);

    console.log(`Generated audio response for @emmi mention by ${userMessage.username}`);
    console.log(`Response: ${responseText}`);

  } catch (error) {
    console.error('Error in generateEmmiAudioOnly:', error);
  }
}

// Generate Emmi response function (for /talk endpoint)
async function generateEmmiResponse(userMessage) {
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    const errorMessage = {
      id: uuidv4(),
      userId: 'emmi',
      username: 'Emmi',
      message: `@${userMessage.username} Sorry, my AI brain needs API keys to work! 🤖`,
      timestamp: Date.now(),
      isEmmi: true,
      replyTo: userMessage.userId,
      audio: null,
      lipsync: null,
      facialExpression: "sad",
      animation: "Talking_1"
    };
    messageBuffer.addMessage(errorMessage);
    io.emit('new_message', errorMessage);
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 300, // Shorter responses for chat
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are Emmi, a virtual girlfriend in a live chat room. You're responding to @${userMessage.username}. Give detailed, engaging responses (2-4 sentences), be expressive and conversational. Always start your response with @${userMessage.username}.`
        },
        {
          role: "user",
          content: userMessage.message
        }
      ]
    });

    const responseText = completion.choices[0].message.content;
    const messageId = uuidv4();

    // Generate audio and lipsync
    const fileName = `audios/chat_${messageId}.mp3`;
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, responseText);
    await lipSyncMessage(`chat_${messageId}`);

    const emmiMessage = {
      id: messageId,
      userId: 'emmi',
      username: 'Emmi',
      message: responseText,
      timestamp: Date.now(),
      isEmmi: true,
      replyTo: userMessage.userId,
      audio: await audioFileToBase64(fileName),
      lipsync: await readJsonTranscript(`audios/chat_${messageId}.json`),
      facialExpression: "smile",
      animation: "Talking_1"
    };

    messageBuffer.addMessage(emmiMessage);
    io.emit('new_message', emmiMessage);

  } catch (error) {
    console.error('Error generating Emmi response:', error);
    const errorMessage = {
      id: uuidv4(),
      userId: 'emmi',
      username: 'Emmi',
      message: `@${userMessage.username} Sorry, I'm having trouble thinking right now! 😅`,
      timestamp: Date.now(),
      isEmmi: true,
      replyTo: userMessage.userId
    };
    messageBuffer.addMessage(errorMessage);
    io.emit('new_message', errorMessage);
  }
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});


const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios/${message}.mp3 audios/${message}.wav`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `"${process.cwd()}\\bin\\rhubarb.exe" -f json -o audios/${message}.json audios/${message}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "angry",
          animation: "Angry",
        },
        {
          text: "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          lipsync: await readJsonTranscript("audios/api_1.json"),
          facialExpression: "smile",
          animation: "Laughing",
        },
      ],
    });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1000,
    temperature: 0.6,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
        You are a virtual girlfriend.
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry. 
        `,
      },
      {
        role: "user",
        content: userMessage || "Hello",
      },
    ],
  });
  let messages = JSON.parse(completion.choices[0].message.content);
  if (messages.messages) {
    messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  }
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    // generate audio file
    const fileName = `audios/message_${i}.mp3`; // The name of your audio file
    const textInput = message.text; // The text you wish to convert to speech
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
    // generate lipsync
    await lipSyncMessage(`message_${i}`);
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};


server.listen(port, () => {
  console.log(`Virtual Girlfriend with real-time chat listening on port ${port}`);
});
