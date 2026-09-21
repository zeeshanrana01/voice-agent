# LiveKit Voice AI Assistant (Python Agent + Next.js Web App)

A modern, full-duplex real-time voice AI assistant with ultra-low latency WebRTC streaming, intelligent turn-taking, and a sleek web interface.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzeeshanrana01%2Fvoice-agent&root-directory=web&env=LIVEKIT_URL,LIVEKIT_API_KEY,LIVEKIT_API_SECRET,NEXT_PUBLIC_LIVEKIT_URL&envDescription=LiveKit%20Cloud%20Credentials&project-name=voice-agent-web)

---

## Architecture Overview

- **Python Voice Agent (`agent.py`)**:
  - **Speech-to-Text (STT)**: Deepgram Nova-3
  - **Large Language Model (LLM)**: Google Gemma 4 (31B IT)
  - **Text-to-Speech (TTS)**: Inworld TTS (Voice: *Ashley*)
  - **Audio Enhancement**: ai_coustics neural noise reduction
  - **Turn Detection**: LiveKit Turn Detector
- **Web Application (`web/`)**:
  - **Framework**: Next.js 14 (App Router, TypeScript)
  - **UI/UX**: Tailwind CSS, Glassmorphism, Lucide Icons
  - **Visualizer**: Reactive 2D/Canvas Audio Orb responding to live voice amplitude & agent states (`listening`, `thinking`, `speaking`)
  - **Features**: Real-time dual transcription feed, microphone mute/unmute, audio device switcher, and WebRTC participant token generation.

---

## Deploying to Vercel (Frontend)

You can deploy the web frontend to Vercel in 1 minute using either the button above or manually through the Vercel Dashboard:

### Option 1: One-Click Deploy Button
Click the **[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzeeshanrana01%2Fvoice-agent&root-directory=web&env=LIVEKIT_URL,LIVEKIT_API_KEY,LIVEKIT_API_SECRET,NEXT_PUBLIC_LIVEKIT_URL&envDescription=LiveKit%20Cloud%20Credentials&project-name=voice-agent-web)** badge above. It will automatically pre-configure the repository and the `web` root directory!

### Option 2: Manual Import in Vercel
1. Go to **[vercel.com/new](https://vercel.com/new)**.
2. Select your GitHub repository: `zeeshanrana01/voice-agent`.
3. **CRITICAL STEP - Root Directory**:
   - Next to **Root Directory**, click **Edit**.
   - Type or select: `web`.
   - Click **Continue**.
4. **Environment Variables**:
   Add the following 4 environment variables:
   | Key | Value | Description |
   | --- | --- | --- |
   | `LIVEKIT_URL` | `wss://<your-project>.livekit.cloud` | Your LiveKit Cloud Server URL |
   | `LIVEKIT_API_KEY` | `<your-api-key>` | LiveKit API Key (from Cloud Dashboard) |
   | `LIVEKIT_API_SECRET` | `<your-api-secret>` | LiveKit API Secret (from Cloud Dashboard) |
   | `NEXT_PUBLIC_LIVEKIT_URL` | `wss://<your-project>.livekit.cloud` | Public LiveKit URL for the browser |
5. Click **Deploy**.
   - Vercel will build and deploy your live frontend at `https://<your-project>.vercel.app`.

---

## Running the Python Backend Worker

The Next.js frontend connects via WebRTC to **LiveKit Cloud**. Whenever a user starts a conversation, LiveKit Cloud dispatches the call to your Python worker (`agent.py`).

### Option A: Run Locally on Your Computer
Keep the Python agent running in your terminal whenever you want to chat:
```powershell
# From project root
.\.venv\Scripts\python.exe agent.py dev
```
*(Any user worldwide opening your Vercel web link will now be able to speak with your local agent!)*

### Option B: Deploy Worker 24/7 to the Cloud
If you want the agent to answer calls even when your computer is shut down, you can deploy the Docker container to a cloud host (e.g., Railway, Render, Fly.io, or LiveKit Cloud Agents):
```bash
docker build -t voice-agent .
docker run --env-file .env voice-agent
```

---

## Local Development Quick Start

### 1. Start Python Agent
```powershell
.\.venv\Scripts\python.exe agent.py dev
```

### 2. Start Next.js Frontend
```powershell
cd web
npm run dev
```

### 3. Open Browser
Navigate to **[http://localhost:3000](http://localhost:3000)** and start talking!

---

## Project Structure

```
voice_agent/
├── agent.py                 # LiveKit Python agent worker definition
├── pyproject.toml           # Python dependencies
├── Dockerfile               # Production container for cloud deployment
├── .env.example             # Backend environment template
├── README.md                # Project documentation & deployment guide
└── web/                     # Next.js 14 Modern Web Application
    ├── .env.example         # Web environment template
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   │   └── connection-details/route.ts  # LiveKit token generator
    │   │   ├── globals.css                      # Modern dark theme styles
    │   │   ├── layout.tsx                       # App layout & fonts
    │   │   └── page.tsx                         # Voice assistant interface
    │   └── components/
    │       ├── AudioOrb.tsx                     # Reactive Canvas voice visualizer
    │       ├── ControlBar.tsx                   # Microphone & device controls
    │       ├── TranscriptionView.tsx            # Real-time dual captions
    │       └── VoiceAssistant.tsx               # WebRTC connection coordinator
    ├── package.json
    ├── tailwind.config.ts
    └── tsconfig.json
```
