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
