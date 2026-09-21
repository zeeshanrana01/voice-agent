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
