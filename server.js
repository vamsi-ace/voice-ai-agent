const express = require("express");
const http = require("http");
const { getGroqResponse } = require("./models/groq");
const WebSocket = require("ws");
const fs = require("fs");
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const dotenv = require("dotenv");
const { generateAudio, initializePlayHT } = require("./models/playht");

dotenv.config();

const app = express();
const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({ server });
const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);

let messageHistory = [{
  role: "system",
  content: "Please give short meaningful messages, wait for 1 second to let the users complete their sentences",
}];
let keepAliveInterval;
let messageCount = 0;
let currentSessionId = 0;
let audioSessionId = 0;
let audioGeneratedCount = 0;
let audioPlayedCount = 0;

// Validate Environment Variables
if (!process.env.DEEPGRAM_API_KEY || !process.env.GROQ_API_KEY || 
    !process.env.PLAY_API_KEY || !process.env.PLAY_USERID) {
  console.error("Missing required environment variables. Check your .env file.");
  process.exit(1);
}

// Initialize PlayHT
initializePlayHT();

// Logging Function
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${message}`;
  fs.appendFileSync("./logs.txt", `${logEntry}\n`);
  console.log(logEntry);
}

// Send Audio Stream to WebSocket
async function sendAudioStream(audioStream, webSocket) {
  audioStream.on("data", (chunk) => {
    const buffer = Uint8Array.from(chunk).buffer;
    webSocket.send(
      JSON.stringify({
        type: "audio",
        output: Array.from(new Uint8Array(buffer)),
        sessionId: currentSessionId,
        audioSessionId,
      })
    );
  });
}

// Generate and Send Audio
async function handleAudioGeneration(responseText, webSocket) {
  console.time("PlayHT API Time");
  const audioStream = await generateAudio(responseText);
  audioGeneratedCount++;
  audioSessionId++;

  webSocket.send(
    JSON.stringify({
      type: "audio_session",
      sessionId: currentSessionId,
      audioSessionId,
    })
  );

  if (audioGeneratedCount === audioPlayedCount) {
    sendAudioStream(audioStream, webSocket);
  }

  console.timeEnd("PlayHT API Time");
}

// Setup Deepgram Transcription
function configureDeepgram(webSocket) {
  const deepgramConnection = deepgramClient.listen.live({
    language: "en",
    punctuate: true,
    smart_format: true,
    model: "nova-2-phonecall",
    endpointing: 400,
  });

  // Maintain Connection
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  keepAliveInterval = setInterval(() => deepgramConnection.keepAlive(), 10000);

  // Event Handlers
  deepgramConnection.addListener(LiveTranscriptionEvents.Open, () => {
    logMessage("Deepgram: Connection established.");
  });

  deepgramConnection.addListener(LiveTranscriptionEvents.Transcript, async (data) => {
    if (data.is_final && data.channel.alternatives[0].transcript) {
      const transcript = data.channel.alternatives[0].words
        .map((word) => word.punctuated_word || word.word)
        .join(" ");
      
      logMessage(`Deepgram Transcription: ${transcript}`);
      webSocket.send(JSON.stringify({ type: "caption", output: transcript }));

      if (/disconnect/i.test(transcript)) {
        logMessage("Disconnect command received. Closing connection.");
        webSocket.send(JSON.stringify({ type: "caption", output: "#assistant stopped#" }));
        deepgramConnection.finish();
        webSocket.close();
      } else {
        messageCount++;
        currentSessionId = messageCount;
        audioPlayedCount++;
        webSocket.send(JSON.stringify({ type: "audio_session", sessionId: currentSessionId }));

        const groqResponse = await getGroqResponse(transcript, messageHistory);
        logMessage(`Groq Response: ${groqResponse}`);
        await handleAudioGeneration(groqResponse, webSocket);
      }
    }
  });

  deepgramConnection.addListener(LiveTranscriptionEvents.Close, () => {
    logMessage("Deepgram: Connection closed.");
    clearInterval(keepAliveInterval);
    deepgramConnection.finish();
  });

  deepgramConnection.addListener(LiveTranscriptionEvents.Error, (error) => {
    logMessage(`Deepgram Error: ${error.message}`);
  });

  deepgramConnection.addListener(LiveTranscriptionEvents.Warning, (warning) => {
    logMessage(`Deepgram Warning: ${warning}`);
  });

  return deepgramConnection;
}

// WebSocket Connection Handler
webSocketServer.on("connection", (webSocket) => {
  logMessage("WebSocket: Client connected.");
  let deepgramConnection = configureDeepgram(webSocket);

  webSocket.on("message", (message) => {
    if (deepgramConnection.getReadyState() === 1) {
      deepgramConnection.send(message);
    } else {
      logMessage("WebSocket: Deepgram connection not open. Reattempting connection.");
      deepgramConnection.finish();
      deepgramConnection.removeAllListeners();
      deepgramConnection = configureDeepgram(webSocket);
    }
  });

  webSocket.on("close", () => {
    logMessage("WebSocket: Client disconnected.");
    deepgramConnection.finish();
    deepgramConnection.removeAllListeners();
  });
});

// Serve Static Files
app.use(express.static("public/"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Start Server
const PORT = 3000;
server.listen(PORT, () => {
  logMessage(`Server is running at http://localhost:${PORT}`);
});
