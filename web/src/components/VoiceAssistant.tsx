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
