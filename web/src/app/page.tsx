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
