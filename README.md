================================================
FILE: README.md
================================================
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



================================================
FILE: agent.py
================================================
import logging
import os
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, inference, TurnHandlingOptions

load_dotenv(".env")

# Filter out harmless Windows asyncio polling watchdog warnings from terminal
class EventLoopWatchdogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return "event loop blocked" not in record.getMessage()

logging.getLogger("livekit.agents").addFilter(EventLoopWatchdogFilter())


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a helpful voice AI assistant.
            You eagerly assist users with their questions by providing information from your extensive knowledge.
            Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
            You are curious, friendly, and have a sense of humor.""",
        )


server = AgentServer()


@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    # Initialize AgentSession with Deepgram STT, Gemma LLM, and Inworld TTS
    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=inference.LLM(model="google/gemma-4-31b-it"),
        tts=inference.TTS(
            model="inworld/inworld-tts-2",
            voice="Ashley",
        ),
        turn_handling=TurnHandlingOptions(
            turn_detection=inference.TurnDetector(),
        ),
    )

    # session.start automatically establishes the single room connection via RoomIO
    await session.start(
        agent=Assistant(),
        room=ctx.room,
    )

    # Greet user once connected
    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )


if __name__ == "__main__":
    print("\n" + "=" * 65)
    print(" >>> Ashley Voice AI Agent Worker Starting Up <<<")
    print(" LiveKit Cloud: Connected & Ready")
    print(" To talk to the agent: Open your browser and click 'Start Voice Conversation'")
    print("=" * 65 + "\n")
    agents.cli.run_app(server)


================================================
FILE: Dockerfile
================================================
# This is an example Dockerfile that builds a minimal container for running LK Agents
# For more information on the build process, see https://docs.livekit.io/agents/ops/deployment/builds/
# syntax=docker/dockerfile:1

# Use the official UV Python base image with Python 3.13 on Debian Bookworm
# UV is a fast Python package manager that provides better performance than pip
# We use the slim variant to keep the image size smaller while still having essential tools
ARG PYTHON_VERSION=3.13
FROM ghcr.io/astral-sh/uv:python${PYTHON_VERSION}-bookworm-slim AS base

# Keeps Python from buffering stdout and stderr to avoid situations where
# the application crashes without emitting any logs due to buffering.
ENV PYTHONUNBUFFERED=1

# Compile Python source to bytecode (.pyc) during install so the first import
# doesn't pay the compilation cost. This reduces agent cold-start time at the
# expense of a slightly longer build.
ENV UV_COMPILE_BYTECODE=1

# --- Build stage ---
# Install dependencies, build native extensions, and prepare the application
FROM base AS build

# Install build dependencies required for Python packages with native extensions
# gcc: C compiler needed for building Python packages with C extensions
# g++: C++ compiler needed for building Python packages with C++ extensions
# python3-dev: Python development headers needed for compilation
# We clean up the apt cache after installation to keep the image size down
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
  && rm -rf /var/lib/apt/lists/*

# Create a new directory for our application code
# And set it as the working directory
WORKDIR /app

# Copy just the dependency files first, for more efficient layer caching
COPY pyproject.toml uv.lock ./
RUN mkdir -p src

# Install Python dependencies using UV's lock file
# --locked ensures we use exact versions from uv.lock for reproducible builds
# This creates a virtual environment and installs all dependencies
# Ensure your uv.lock file is checked in for consistency across environments
RUN uv sync --locked

# Pre-download any ML models or files the agent needs
# This runs before COPY . . so the download layer is cached across code-only changes.
# The module-level command discovers installed livekit-plugins-* packages without
# loading your agent code.
RUN uv run --module livekit.agents download-files

# Copy all remaining application files into the container
# This includes source code, configuration files, and dependency specifications
# (Excludes files specified in .dockerignore)
COPY . .

# --- Production stage ---
# Build tools (gcc, g++, python3-dev) are not included in the final image
FROM base

# Create a non-privileged user that the app will run under.
# See https://docs.docker.com/build/building/best-practices/#user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/app" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    appuser

WORKDIR /app

# Copy the application and virtual environment with correct ownership in a single layer
# This avoids expensive recursive chown and excludes build tools from the final image
COPY --from=build --chown=appuser:appuser /app /app

# Switch to the non-privileged user for all subsequent operations
# This improves security by not running as root
USER appuser

# Run the application using UV
# UV will activate the virtual environment and run the agent.
# The "start" command tells the worker to connect to LiveKit and begin waiting for jobs.
CMD ["uv", "run", "agent.py", "start"]



================================================
FILE: pyproject.toml
================================================
[project]
name = "voice-agent"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
authors = [
    { email = "zeeshanrana2014@gmail.com" }
]
requires-python = ">=3.14"
dependencies = [
    "livekit-agents>=1.8.2",
    "livekit-plugins-ai-coustics>=0.3.2",
    "python-dotenv>=1.2.3",
]

[project.scripts]
voice-agent = "agent:main"

[tool.vercel]
entrypoint = "agent.py"

[build-system]
requires = ["uv_build>=0.12.17,<0.13.0"]
build-backend = "uv_build"



================================================
FILE: .dockerignore
================================================
# Project tests
test/
tests/
eval/
evals/

# Python bytecode and artifacts
__pycache__/
*.py[cod]
*.pyo
*.pyd
*.egg-info/
dist/
build/

# Virtual environments
.venv/
venv/

# Caches and test output
.cache/
.pytest_cache/
.ruff_cache/
coverage/

# Logs and temp files
*.log
*.gz
*.tgz
.tmp
.cache

# Environment variables
.env
.env.*

# VCS, editor, OS
.git
.gitignore
.gitattributes
.github/
.idea/
.vscode/
.DS_Store

# Project docs and misc
README.md
CONTRIBUTING.md
LICENSE

# Coding agent files
.claude/
.codex/
.cursor/
.windsurf/
.gemini/
.cline/
.clinerules
.clinerules/
.aider*
.cursorrules
.cursorignore
.cursorindexingignore
.clineignore
.codeiumignore
.geminiignore
.windsurfrules
CLAUDE.md
AGENTS.md
GEMINI.md
.github/copilot-instructions.md
.github/personal-instructions.md
.github/instructions/



================================================
FILE: .env.example
================================================
# LiveKit Cloud Credentials
LIVEKIT_URL=wss://<your-project-subdomain>.livekit.cloud
LIVEKIT_API_KEY=<your-api-key>
LIVEKIT_API_SECRET=<your-api-secret>



================================================
FILE: .python-version
================================================
3.14



================================================
FILE: src/voice_agent/__init__.py
================================================
def main() -> None:
    print("Hello from voice-agent!")



================================================
FILE: web/next.config.mjs
================================================
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;



================================================
FILE: web/package.json
================================================
{
  "name": "voice-agent-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@livekit/components-react": "^2.6.4",
    "@livekit/components-styles": "^1.1.4",
    "clsx": "^2.1.1",
    "framer-motion": "^11.11.9",
    "livekit-client": "^2.7.2",
    "livekit-server-sdk": "^2.9.2",
    "lucide-react": "^0.453.0",
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@types/node": "^20.17.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3"
  }
}



================================================
FILE: web/postcss.config.mjs
================================================
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;



================================================
FILE: web/tailwind.config.ts
================================================
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 2s linear infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;



================================================
FILE: web/tsconfig.json
================================================
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}



================================================
FILE: web/.env.example
================================================
# LiveKit Cloud Credentials for Next.js Web App
LIVEKIT_URL=wss://<your-project-subdomain>.livekit.cloud
LIVEKIT_API_KEY=<your-api-key>
LIVEKIT_API_SECRET=<your-api-secret>
NEXT_PUBLIC_LIVEKIT_URL=wss://<your-project-subdomain>.livekit.cloud



================================================
FILE: web/src/app/globals.css
================================================
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #090d16;
    --foreground: #f8fafc;
  }
}

body {
  color: var(--foreground);
  background-color: var(--background);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  overflow-x: hidden;
}

/* Custom Glassmorphism */
.glass-panel {
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-pill {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Glowing Aura Background */
.ambient-glow {
  position: absolute;
  filter: blur(100px);
  border-radius: 9999px;
  pointer-events: none;
  opacity: 0.35;
  transition: all 1s ease-in-out;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.4);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}



================================================
FILE: web/src/app/layout.tsx
================================================
import type { Metadata } from "next";
import "./globals.css";
import "@livekit/components-styles";

export const metadata: Metadata = {
  title: "Live Voice AI Assistant",
  description: "Next-generation real-time voice agent powered by LiveKit, Deepgram, and Gemma.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950 text-slate-100 antialiased selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}



================================================
FILE: web/src/app/page.tsx
================================================
"use client";

import React, { useState } from "react";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import {
  Mic,
  Sparkles,
  Zap,
  Volume2,
  Shield,
  Layers,
  Activity,
  Terminal,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function Home() {
  const [connectionDetails, setConnectionDetails] = useState<{
    serverUrl: string;
    participantToken: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/connection-details");
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to retrieve connection token.");
      }

      setConnectionDetails({
        serverUrl: data.serverUrl,
        participantToken: data.participantToken,
      });
    } catch (err: any) {
      console.error("Connection error:", err);
      setError(err.message || "Could not connect to the voice agent server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = (reason?: string) => {
    setConnectionDetails(null);
    if (reason) {
      setError(reason);
    }
  };

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-purple-600/10 blur-[110px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              Ashley Voice AI
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold tracking-wide uppercase">
                Live
              </span>
            </h1>
            <p className="text-xs text-slate-400">Next.js & LiveKit Real-Time WebRTC</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 glass-pill px-3 py-1.5 rounded-full text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Agent: <strong className="text-slate-200">my-agent</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        {connectionDetails ? (
          /* Active Voice Session */
          <VoiceAssistant
            serverUrl={connectionDetails.serverUrl}
            token={connectionDetails.participantToken}
            onDisconnect={handleDisconnect}
            agentName="Ashley"
          />
        ) : (
          /* Landing / Connect Hero Card */
          <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 glass-pill px-4 py-1.5 rounded-full text-xs font-medium text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full Duplex Voice Agent with Sub-Second Latency</span>
            </div>

            {/* Hero Heading */}
            <div className="space-y-3">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Talk with your AI in{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                  real-time voice
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                Powered by your local LiveKit agent with Deepgram Nova-3 speech recognition,
                Gemma 4 intelligence, and Inworld neural vocal synthesis.
              </p>
            </div>

            {/* Agent Architecture Specs Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
              <div className="glass-panel p-3.5 rounded-2xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">STT Engine</div>
                <div className="text-xs font-bold text-indigo-300 mt-1">Deepgram Nova-3</div>
              </div>
              <div className="glass-panel p-3.5 rounded-2xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">LLM Model</div>
                <div className="text-xs font-bold text-purple-300 mt-1">Gemma 4 (31B)</div>
              </div>
              <div className="glass-panel p-3.5 rounded-2xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">TTS Voice</div>
                <div className="text-xs font-bold text-pink-300 mt-1">Inworld Ashley</div>
              </div>
              <div className="glass-panel p-3.5 rounded-2xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Noise Filter</div>
                <div className="text-xs font-bold text-emerald-300 mt-1">ai_coustics</div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="max-w-md mx-auto p-3.5 bg-red-950/60 border border-red-800/80 rounded-2xl text-xs text-red-200 flex items-start gap-2.5 text-left">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong>Connection Error:</strong> {error}
                </div>
              </div>
            )}

            {/* Connect Action Button */}
            <div className="pt-2">
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting to LiveKit...</span>
                  </>
                ) : (
                  <>
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <Mic className="w-4 h-4 text-white" />
                    </div>
                    <span>Start Voice Conversation</span>
                    <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Terminal Helper Tip */}
            <div className="max-w-md mx-auto pt-4">
              <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>Make sure your python agent is running:</span>
                <code className="bg-slate-900 px-2 py-0.5 rounded text-indigo-300 font-mono text-[10px]">
                  python agent.py dev
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-900 gap-2">
        <div>
          Voice AI Web App · Built with Next.js 14, Tailwind CSS, & LiveKit
        </div>
        <div className="flex items-center gap-4">
          <span>End-to-End Encrypted WebRTC</span>
          <span>•</span>
          <span>Zero Server Storage</span>
        </div>
      </footer>
    </main>
  );
}



================================================
FILE: web/src/app/api/connection-details/route.ts
================================================
import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    const wsUrl = (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL)?.trim();

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'LiveKit environment variables (LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL) are not configured.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const roomName = searchParams.get('roomName') || `room-${Date.now().toString(36)}-${randomSuffix}`;
    const participantName = searchParams.get('participantName') || `user-${randomSuffix}`;

    // 1. Create participant access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    // 2. Ensure agent dispatch exists for this room
    try {
      const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      const dispatchClient = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
      await dispatchClient.createDispatch(roomName, '');
    } catch (dispatchError: any) {
      console.warn('Dispatch creation note:', dispatchError?.message || dispatchError);
    }

    const participantToken = await at.toJwt();

    return NextResponse.json({
      serverUrl: wsUrl,
      roomName,
      participantToken,
      participantName,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}



================================================
FILE: web/src/components/AudioOrb.tsx
================================================
"use client";

import React, { useEffect, useRef } from "react";
import { useVoiceAssistant, useTrackVolume } from "@livekit/components-react";

interface AudioOrbProps {
  size?: number;
  className?: string;
}

export const AudioOrb: React.FC<AudioOrbProps> = ({ size = 260, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const volume = useTrackVolume(audioTrack);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = size * 0.3;

      // Determine state colors and motion dynamics
      let primaryColor = "rgba(99, 102, 241, "; // Indigo (Default)
      let secondaryColor = "rgba(168, 85, 247, "; // Purple
      let speed = 0.03;
      let amplitude = 6;

      if (agentState === "speaking") {
        primaryColor = "rgba(59, 130, 246, "; // Blue
        secondaryColor = "rgba(16, 185, 129, "; // Emerald
        speed = 0.08;
        amplitude = 18 + (volume || 0) * 45;
      } else if (agentState === "listening") {
        primaryColor = "rgba(6, 182, 212, "; // Cyan
        secondaryColor = "rgba(59, 130, 246, "; // Blue
        speed = 0.05;
        amplitude = 12;
      } else if (agentState === "thinking") {
        primaryColor = "rgba(236, 72, 153, "; // Pink
        secondaryColor = "rgba(139, 92, 246, "; // Purple
        speed = 0.12;
        amplitude = 15;
      } else if (agentState === "connecting" || agentState === "initializing") {
        primaryColor = "rgba(245, 158, 11, "; // Amber
        secondaryColor = "rgba(251, 191, 36, ";
        speed = 0.04;
        amplitude = 8;
      } else {
        // Disconnected or idle
        primaryColor = "rgba(100, 116, 139, ";
        secondaryColor = "rgba(71, 85, 105, ";
        speed = 0.02;
        amplitude = 4;
      }

      phase += speed;

      // 1. Draw outer ambient blurred glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.4,
        centerX,
        centerY,
        baseRadius * 1.8 + amplitude
      );
      glowGrad.addColorStop(0, primaryColor + "0.45)");
      glowGrad.addColorStop(0.6, secondaryColor + "0.2)");
      glowGrad.addColorStop(1, "transparent");

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.8 + amplitude, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw organic oscillating concentric layers
      const layers = 3;
      for (let l = 0; l < layers; l++) {
        ctx.beginPath();
        const layerOffset = (l * Math.PI) / layers;
        const currentAmp = amplitude * (1 - l * 0.2);

        for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
          const wave1 = Math.sin(angle * 4 + phase + layerOffset);
          const wave2 = Math.cos(angle * 3 - phase * 0.8 + layerOffset);
          const r = baseRadius + (wave1 + wave2) * (currentAmp * 0.5);

          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (angle === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(
          centerX - baseRadius,
          centerY - baseRadius,
          centerX + baseRadius,
          centerY + baseRadius
        );
        grad.addColorStop(0, primaryColor + `${0.5 - l * 0.12})`);
        grad.addColorStop(1, secondaryColor + `${0.6 - l * 0.12})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 3 - l * 0.6;
        ctx.stroke();

        if (l === 0) {
          // Fill central core
          const coreGrad = ctx.createRadialGradient(
            centerX - baseRadius * 0.3,
            centerY - baseRadius * 0.3,
            5,
            centerX,
            centerY,
            baseRadius
          );
          coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          coreGrad.addColorStop(0.3, primaryColor + "0.8)");
          coreGrad.addColorStop(0.8, secondaryColor + "0.65)");
          coreGrad.addColorStop(1, primaryColor + "0.4)");

          ctx.fillStyle = coreGrad;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [agentState, volume, size]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background radial glow */}
      <div
        className={`absolute rounded-full filter blur-2xl transition-all duration-700 pointer-events-none ${
          agentState === "speaking"
            ? "bg-cyan-500/30 scale-125"
            : agentState === "listening"
            ? "bg-blue-500/25 scale-110"
            : agentState === "thinking"
            ? "bg-pink-500/30 scale-120 animate-pulse"
            : "bg-indigo-500/15 scale-95"
        }`}
        style={{ width: size * 0.9, height: size * 0.9 }}
      />

      <canvas
        ref={canvasRef}
        width={size * 1.5}
        height={size * 1.5}
        className="relative z-10 transition-transform duration-300"
        style={{ width: size, height: size }}
      />
    </div>
  );
};



================================================
FILE: web/src/components/ControlBar.tsx
================================================
"use client";

import React, { useState, useEffect } from "react";
import {
  useLocalParticipant,
  useRoomContext,
  useVoiceAssistant,
  useMediaDeviceSelect,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Volume2,
  Radio,
  Sliders,
  Check,
} from "lucide-react";

interface ControlBarProps {
  onDisconnect?: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({ onDisconnect }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { state: agentState } = useVoiceAssistant();

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Device selectors
  const audioInputDevices = useMediaDeviceSelect({ kind: "audioinput" });
  const audioOutputDevices = useMediaDeviceSelect({ kind: "audiooutput" });

  useEffect(() => {
    if (localParticipant) {
      setIsMicEnabled(localParticipant.isMicrophoneEnabled);
    }
  }, [localParticipant?.isMicrophoneEnabled]);

  const toggleMic = async () => {
    if (!localParticipant) return;
    const newState = !isMicEnabled;
    await localParticipant.setMicrophoneEnabled(newState);
    setIsMicEnabled(newState);
  };

  const handleDisconnect = () => {
    room?.disconnect();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  // Status badge details
  const getStatusInfo = () => {
    switch (agentState) {
      case "listening":
        return { text: "Listening", color: "bg-cyan-500", ping: true };
      case "thinking":
        return { text: "Thinking", color: "bg-pink-500", ping: true };
      case "speaking":
        return { text: "Speaking", color: "bg-emerald-500", ping: false };
      case "connecting":
      case "initializing":
        return { text: "Connecting...", color: "bg-amber-500", ping: true };
      default:
        return { text: "Connected", color: "bg-indigo-500", ping: false };
    }
  };

  const status = getStatusInfo();

  return (
    <div className="relative flex flex-col items-center">
      {/* Settings Popover Drawer */}
      {showSettings && (
        <div className="absolute bottom-20 z-50 w-80 glass-panel rounded-2xl p-4 shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Audio Devices
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded-md hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          {/* Microphone Selector */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Microphone</label>
              <select
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                value={audioInputDevices.activeDeviceId}
                onChange={(e) => audioInputDevices.setActiveMediaDevice(e.target.value)}
              >
                {audioInputDevices.devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker Selector (if browser supports sinkId) */}
            {audioOutputDevices.devices.length > 0 && (
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Speaker</label>
                <select
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={audioOutputDevices.activeDeviceId}
                  onChange={(e) => audioOutputDevices.setActiveMediaDevice(e.target.value)}
                >
                  {audioOutputDevices.devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Floating Glassmorphic Pill */}
      <div className="glass-panel px-5 py-3 rounded-full flex items-center gap-4 shadow-2xl border border-slate-700/60">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700/50">
          <span className="relative flex h-2.5 w-2.5">
            {status.ping && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.color} opacity-75`}
              />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.color}`} />
          </span>
          <span className="text-xs font-medium text-slate-300 tracking-wide">
            {status.text}
          </span>
        </div>

        {/* Microphone Mute/Unmute */}
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center ${
            isMicEnabled
              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              : "bg-red-600/90 hover:bg-red-500 text-white shadow-lg shadow-red-600/20"
          }`}
          title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Audio Device Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3 rounded-full transition-all duration-200 border ${
            showSettings
              ? "bg-slate-700 text-indigo-300 border-indigo-500/50"
              : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
          }`}
          title="Audio Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Disconnect / End Call */}
        <button
          onClick={handleDisconnect}
          className="p-3 rounded-full bg-slate-800/80 hover:bg-red-600 text-slate-300 hover:text-white transition-all duration-200 border border-slate-700 hover:border-red-500 shadow-md"
          title="End Conversation"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};



================================================
FILE: web/src/components/TranscriptionView.tsx
================================================
"use client";

import React, { useEffect, useRef } from "react";
import { useVoiceAssistant } from "@livekit/components-react";
import { Bot, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  sender: "agent" | "user";
  text: string;
  timestamp: string;
}

interface TranscriptionViewProps {
  messages: Message[];
  agentName?: string;
  userName?: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  messages,
  agentName = "Voice Agent",
  userName = "You",
}) => {
  const { state: agentState } = useVoiceAssistant();
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentState]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-3 text-indigo-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-slate-300">Ready to chat</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Say hello or ask a question. Your conversation transcript will appear here in real-time.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAgent = msg.sender === "agent";
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 text-sm ${
                  isAgent ? "justify-start" : "justify-end"
                }`}
              >
                {isAgent && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-indigo-900/30">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isAgent
                      ? "bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-sm"
                      : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-tr-sm"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold tracking-wide opacity-75">
                      {isAgent ? agentName : userName}
                    </span>
                    <span className="text-[10px] opacity-50">{msg.timestamp}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>

                {!isAgent && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live typing/thinking indicator */}
        {agentState === "thinking" && (
          <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 rounded-full px-3 py-1.5 w-max animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{agentName} is thinking...</span>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
};



================================================
FILE: web/src/components/VoiceAssistant.tsx
================================================
"use client";

import React, { useState, useEffect } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useRoomContext,
  useRemoteParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { RoomEvent, TranscriptionSegment } from "livekit-client";
import { AudioOrb } from "./AudioOrb";
import { TranscriptionView } from "./TranscriptionView";
import { ControlBar } from "./ControlBar";
import { MessageSquare, Cpu, Loader2 } from "lucide-react";

interface VoiceAssistantProps {
  serverUrl: string;
  token: string;
  onDisconnect: (reason?: string) => void;
  agentName?: string;
}

interface ChatMessage {
  id: string;
  sender: "agent" | "user";
  text: string;
  timestamp: string;
}

const InnerVoiceAssistant: React.FC<{
  onDisconnect: (reason?: string) => void;
  agentName: string;
}> = ({ onDisconnect, agentName }) => {
  const room = useRoomContext();
  const { state: agentState, agentTranscriptions } = useVoiceAssistant();
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"visualizer" | "transcript">("visualizer");

  const hasAgentJoined = remoteParticipants.length > 0;

  // Auto-enable microphone on connection
  useEffect(() => {
    if (localParticipant && !localParticipant.isMicrophoneEnabled) {
      localParticipant.setMicrophoneEnabled(true).catch((err) => {
        console.warn("Could not auto-enable microphone:", err);
      });
    }
  }, [localParticipant]);

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Sync agent transcriptions from useVoiceAssistant
  useEffect(() => {
    if (agentTranscriptions && agentTranscriptions.length > 0) {
      const latest = agentTranscriptions[agentTranscriptions.length - 1];
      const text = typeof latest === "string" ? latest : (latest as any)?.text;
      if (text && text.trim()) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.sender === "agent" && lastMsg.id === (latest as any)?.id) {
            return prev.map((m, idx) => (idx === prev.length - 1 ? { ...m, text } : m));
          }
          return [
            ...prev,
            {
              id: (latest as any)?.id || `${Date.now()}-${Math.random()}`,
              sender: "agent",
              text,
              timestamp: formatTime(),
            },
          ];
        });
      }
    }
  }, [agentTranscriptions]);

  // Listen for LiveKit Room Transcriptions & Data messages
  useEffect(() => {
    if (!room) return;

    const handleTranscription = (segments: TranscriptionSegment[], participant?: any) => {
      segments.forEach((seg) => {
        if (!seg.text || !seg.text.trim()) return;
        const isAgent = participant?.isAgent || participant?.identity?.includes("agent");
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === seg.id);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              text: seg.text,
            };
            return updated;
          }
          return [
            ...prev,
            {
              id: seg.id || `${Date.now()}-${Math.random()}`,
              sender: isAgent ? "agent" : "user",
              text: seg.text,
              timestamp: formatTime(),
            },
          ];
        });
      });
    };

    const handleDataReceived = (payload: Uint8Array, participant?: any) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (data && data.message) {
          const isAgent = participant?.isAgent || data.sender === "agent";
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              sender: isAgent ? "agent" : "user",
              text: data.message,
              timestamp: formatTime(),
            },
          ]);
        }
      } catch {
        // Ignore non-json payload
      }
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[82vh] max-h-[850px] glass-panel rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="ambient-glow bg-indigo-500/20 w-96 h-96 -top-20 -left-20" />
      <div className="ambient-glow bg-cyan-500/15 w-96 h-96 -bottom-20 -right-20" />

      {/* Top Navigation Bar */}
      <div className="relative z-10 px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-100 text-sm tracking-wide">
                {agentName}
              </h2>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-medium px-2 py-0.5 rounded-full border border-indigo-500/30">
                Gemma 4 · Inworld
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {hasAgentJoined ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-medium">Connected to {agentName}</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-amber-400 font-medium">Connecting agent into room...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View Switcher (Visualizer vs Full Transcript) */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("visualizer")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "visualizer"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Visualizer
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === "transcript"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Transcript
            {messages.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold">
                {messages.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Visualizer Mode: Center stage Orb */}
        {activeTab === "visualizer" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
            <AudioOrb size={300} className="my-auto" />

            {/* Live Subtitle Strip */}
            <div className="w-full max-w-lg mt-auto mb-4">
              {!hasAgentJoined ? (
                <div className="glass-pill px-4 py-2.5 rounded-2xl text-xs text-amber-300 border border-amber-500/30 shadow-lg text-center backdrop-blur-md flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Waiting for agent to join... Ensure <code>python agent.py dev</code> is running.</span>
                </div>
              ) : messages.length > 0 ? (
                <div className="glass-pill px-4 py-2.5 rounded-2xl text-xs text-slate-300 border border-slate-700/60 shadow-lg text-center backdrop-blur-md line-clamp-2">
                  <span className="text-indigo-400 font-semibold mr-1.5">
                    {messages[messages.length - 1].sender === "agent" ? agentName : "You"}:
                  </span>
                  {messages[messages.length - 1].text}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium">
                  {agentState === "speaking"
                    ? "Agent is speaking..."
                    : agentState === "thinking"
                    ? "Agent is thinking..."
                    : "Speak freely — the agent is listening"}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Transcript Tab */
          <div className="flex-1 overflow-hidden p-2">
            <TranscriptionView messages={messages} agentName={agentName} />
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="relative z-20 pb-6 pt-2 flex justify-center">
        <ControlBar onDisconnect={onDisconnect} />
      </div>

      {/* Background Audio Player */}
      <RoomAudioRenderer />
    </div>
  );
};

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  serverUrl,
  token,
  onDisconnect,
  agentName = "Ashley",
}) => {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => onDisconnect()}
      onError={(err) => {
        console.error("LiveKitRoom error:", err);
        onDisconnect(err?.message || "Lost connection to voice room.");
      }}
      className="w-full flex items-center justify-center"
    >
      <InnerVoiceAssistant onDisconnect={onDisconnect} agentName={agentName} />
    </LiveKitRoom>
  );
};


