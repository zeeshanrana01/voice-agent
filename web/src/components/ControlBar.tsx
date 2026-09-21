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
