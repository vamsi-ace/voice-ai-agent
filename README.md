## Setup Instructions

## Prerequisites
    Node.js and npm installed.

## project set up
    clone the repository
    git clone https://github.com/vamsi-ace/voice-ai-agent.git
    cd voice-ai-agent
 

## Install dependencies:
  npm install 

## Start the server:
  npm start
  The server will run on http://localhost:3000.

1. Follow the link to http://localhost:3000 
2. Click the mic button to start the web socket server and start broadcasting the audio to the server.
3. Click the mic button to stop the web socket server or say explicitly "disconnect"

## Prompts for seamless communication
```
## To Check Available Slots:

  User Input: Please give me the available slots / show me the available slots
  Sample Output:
    On 27 November, we have 8 AM, 10 AM, 12 PM.
    On 28 November, we have 1 PM, 2 PM, 3 PM.
    On 1 December, we have 2 PM.

## Book a Slot:

  User Input: 
  
  Example 1: Book slot on 28 November at 5 PM 
  Example 2: Book slot on 2nd December at 12 PM
  Example 3: Book slot on 13th October at 12 PM

  Sample Output:
    The slot on 28 November at 5 PM has been successfully booked!
    
## Invalid Booking:

  User Input: 
  
  Example 1: Book slot on 28 November at 2 PM 
  Example 2: Book slot on 30th February at 12 PM
  
  Sample Output:  
    The slot on 28 November at 2 PM is unavailable or already booked

## Other queries:
  The LLM through the response stack generates a contextual response. 
```

## project structure
```
Ai Voice Agent/
│
├── public/                 # Frontend components and static assets
│   ├── index.html          # Main HTML file for the web interface
│   ├── style.css           # CSS file for styling the frontend
│   └── client.js           # Frontend JavaScript for recording, WebSocket handling, and UI interactions
│
├── models/                 # Backend modules for core functionality
│   ├── groq.js             # Handles LLM (Groq) interactions, slot management, and booking logic
│   ├── playht.js           # Integrates with PlayHT API for Text-to-Speech (TTS) functionality
│
├── .env                    # Environment file for sensitive API keys and configurations
```

## Key Components
```
1. Frontend
Purpose: Provides the user interface for audio recording and real-time interactions.

  ## index.html:
  Contains the structure for the microphone interface.
  Includes an audio player to replay responses.

  ## style.css:
  Defines the visual appearance of the interface.

  ## client.js:
  Captures audio using the Web Audio API.
  Manages WebSocket connections to send audio data and receive captions/responses.
  Handles UI updates, such as captions and playback controls.
```

```
2. Backend
Purpose: Processes audio data, manages user queries, integrates APIs, and streams responses.

  ## server.js:
  Sets up an Express server to serve the frontend.
  Manages WebSocket connections for real-time audio streaming and processing.
  Integrates Deepgram for STT, Groq for LLM, and PlayHT for TTS.
  Implements session management to ensure correct handling of simultaneous audio streams.

  ## groq.js:
  Processes text queries using Groq API for interactive conversations.
  Implements get_slots and book_slot functions:
  • get_slots: Retrieves available slots from an in-memory data structure.
  • book_slot: Updates slot availability and confirms bookings.
  Handles natural language processing for slot-related requests (e.g., parsing dates and times).

  ## playht.js:
  Integrates with PlayHT for Text-to-Speech (TTS) responses.
  Streams audio responses back to the frontend for real-time playback.
```

```
3. APIs

  ## Deepgram API:
  Converts speech to text (STT) in real-time.
  ## Groq API:
  Processes user text and generates responses based on conversation history.
  ## PlayHT API:
  Converts text responses into audio using a low-latency TTS engine.
```

## Assumptions Made During Development

  • Slot Data Storage:

  Slots are stored in an in-memory data structure (slotData).
  Assumes slot availability is reset on server restart. Persistent storage like a database is not implemented.
  
  • Audio Format:

  The application uses standard audio formats (e.g., MP3, WAV) for compatibility.
  Assumes the client browser supports Web Audio API for recording and playback.
  
  • Session Management:

  Unique session IDs (sid1 and sid2) are used to handle concurrent audio streams.
  Assumes users interact sequentially within the same session.
  
  • API Limits:

  Relies on free or trial versions of Deepgram, Groq, and PlayHT APIs.
  Assumes API quotas are sufficient for typical usage during testing and demos.
  
  • Date and Time Parsing:

  Assumes user inputs for dates and times are in formats like "27 November" and "10 AM".
  Uses regex to parse these inputs; edge cases may require additional handling.
  
  • Error Handling:

  Basic error handling is implemented for most scenarios (e.g., invalid date/time inputs, API failures).
  Assumes the application will not encounter frequent API or WebSocket failures.
  
  • Real-Time Latency:

  Designed to achieve sub-3-second latency for live streaming.
  Assumes network conditions and API response times are stable.



