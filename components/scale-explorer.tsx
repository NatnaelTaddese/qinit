"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ScaleCategory,
  ScaleVariant,
  ScaleType,
  RootNote,
  SCALE_INFO,
  NATURAL_NOTES,
  NOTES_WITH_SHARPS,
  getScaleType,
  hasVariants,
  getScaleNotesWithDegrees,
  getScaleMidiNotes,
} from "@/lib/scales";
import { Quiz } from "./quiz";

type TabType = "kinit" | ScaleCategory | "quiz";

interface ScaleExplorerProps {
  activeTab: TabType;
  variant: ScaleVariant;
  selectedRoot: RootNote;
  onRootChange: (root: RootNote) => void;
  onPlayNote?: (midi: number) => void;
  onStopNote?: (midi: number) => void;
}

// LCD Screen Component - mimics hardware synth/MPC displays
function LCDScreen({
  children,
  className,
  accentColor,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        // Outer bezel - dark plastic frame with sharper corners
        "rounded-[4px]",
        "bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950",
        "p-[3px]",
        "shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        className
      )}
    >
      {/* Inner bezel groove */}
      <div className="rounded-[2px] bg-gradient-to-b from-zinc-950 to-zinc-900 p-[2px]">
        {/* Screen surface */}
        <div
          className="relative rounded-[1px] p-4"
          style={{
            // LCD screen background - that classic blue-green or amber tint
            background: accentColor
              ? `linear-gradient(145deg, ${accentColor}08, ${accentColor}15, ${accentColor}05)`
              : "linear-gradient(145deg, #0a1a18, #0f2520, #0a1815)",
            // Subtle scanline effect
            boxShadow: `
              inset 0 0 60px rgba(0,0,0,0.3),
              inset 0 1px 0 rgba(255,255,255,0.03),
              inset 0 -1px 0 rgba(0,0,0,0.5)
            `,
          }}
        >
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-[1px]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.3) 2px,
                rgba(0,0,0,0.3) 4px
              )`,
            }}
          />
          {/* Screen reflection */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[1px]"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
            }}
          />
          {/* Content */}
          <div className="relative z-10">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ScaleExplorer({
  activeTab,
  variant,
  selectedRoot,
  onRootChange,
  onPlayNote,
  onStopNote,
}: ScaleExplorerProps) {
  // Get current scale type based on tab and variant
  const currentScaleType: ScaleType | null =
    activeTab === "kinit" || activeTab === "quiz"
      ? null
      : getScaleType(activeTab, hasVariants(activeTab) ? variant : null);

  const scaleInfo = currentScaleType ? SCALE_INFO[currentScaleType] : null;
  const scaleNotes = currentScaleType
    ? getScaleNotesWithDegrees(currentScaleType, selectedRoot)
    : [];

  // Play scale
  const playScale = useCallback(
    async (direction: "ascending" | "descending") => {
      if (!currentScaleType || !onPlayNote || !onStopNote) return;

      const midiNotes = getScaleMidiNotes(currentScaleType, selectedRoot, 4);
      const notesToPlay =
        direction === "ascending"
          ? [...midiNotes, midiNotes[0] + 12] // Add octave
          : [...midiNotes, midiNotes[0] + 12].reverse();

      for (const note of notesToPlay) {
        onPlayNote(note);
        await new Promise((resolve) => setTimeout(resolve, 300));
        onStopNote(note);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    },
    [currentScaleType, selectedRoot, onPlayNote, onStopNote],
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {scaleInfo && (
        <LCDScreen accentColor={scaleInfo.color}>
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            {/* Scale Title */}
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-60 font-mono"
                style={{ color: scaleInfo.color }}
              >
                Ethiopian Pentatonic · {scaleInfo.variant || "Unique"}
              </div>
              <h2
                className="text-xl font-bold tracking-wide"
                style={{ color: scaleInfo.color }}
              >
                {scaleInfo.name}
              </h2>
            </div>

            {/* Scale Notes Display */}
            <div
              className="rounded px-3 py-2 text-right font-mono"
              style={{
                backgroundColor: `${scaleInfo.color}15`,
                border: `1px solid ${scaleInfo.color}30`,
              }}
            >
              <div
                className="text-[9px] uppercase tracking-wider mb-1 opacity-50"
                style={{ color: scaleInfo.color }}
              >
                {selectedRoot} {scaleInfo.name.split(" ")[0]}
              </div>
              <div className="flex gap-1.5 text-sm font-medium">
                {scaleNotes.map(({ note }, i) => (
                  <span
                    key={i}
                    className={cn("transition-colors", i === 0 && "font-bold")}
                    style={{ color: i === 0 ? scaleInfo.color : `${scaleInfo.color}99` }}
                  >
                    {note}
                  </span>
                ))}
                <span className="opacity-50" style={{ color: scaleInfo.color }}>·</span>
                <span style={{ color: scaleInfo.color }}>
                  {scaleNotes[0]?.note}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p
            className="text-sm leading-relaxed mb-3 opacity-90"
            style={{ color: scaleInfo.color }}
          >
            {scaleInfo.description}
          </p>

          {/* Cultural Context */}
          <p
            className="text-sm leading-relaxed mb-4 opacity-60"
            style={{ color: scaleInfo.color }}
          >
            {scaleInfo.culturalContext}
          </p>

          {/* Bottom info row */}
          <div
            className="flex items-center justify-between pt-3 border-t text-xs font-mono"
            style={{ borderColor: `${scaleInfo.color}20` }}
          >
            <div style={{ color: `${scaleInfo.color}80` }}>
              <span className="opacity-60">ARTISTS:</span>{" "}
              <span className="opacity-90">{scaleInfo.notableArtists.slice(0, 3).join(" · ")}</span>
            </div>
            <div style={{ color: `${scaleInfo.color}80` }}>
              <span className="opacity-60">FORMULA:</span>{" "}
              <span className="opacity-90">{scaleInfo.intervals}</span>
            </div>
          </div>
        </LCDScreen>
      )}

      {/* Kiñit Overview */}
      {activeTab === "kinit" && (
        <>
          <LCDScreen>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-40 font-mono text-emerald-400">
              System Overview
            </div>
            <h2 className="text-xl font-bold tracking-wide mb-4 text-emerald-400">
              Ethiopian Kiñit Scales
            </h2>
            <p className="text-sm leading-relaxed mb-3 text-emerald-400/80">
              Kiñit (ቅኝት) refers to the system of modes or scales in Ethiopian
              music. Unlike Western music's major/minor dichotomy, Ethiopian music
              uses a rich palette of pentatonic scales, each with its own
              emotional character and cultural significance.
            </p>
            <p className="text-sm leading-relaxed text-emerald-400/60">
              Select a scale above to explore its unique intervals, cultural
              context, and notable artists who have mastered its expression.
            </p>
          </LCDScreen>

          {/* Ableton Live Device Download */}
          <LCDScreen accentColor="#f97316">
            <div className="flex gap-6">
              {/* Device Screenshot */}
              <div className="shrink-0">
                <div
                  className="rounded-[3px] overflow-hidden"
                  style={{
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)",
                  }}
                >
                  <img
                    src="/kinit-scale-device.png"
                    alt="Kiñit Scale MIDI Transformation Device"
                    className="w-[140px] h-auto"
                  />
                </div>
              </div>

              {/* Info & Download */}
              <div className="flex-1 flex flex-col">
                <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-60 font-mono text-orange-400">
                  Max for Live · Ableton Live 12
                </div>
                <h3 className="text-lg font-bold tracking-wide mb-2 text-orange-400">
                  Kiñit Scale Transformation
                </h3>
                <p className="text-sm leading-relaxed mb-4 text-orange-400/80 flex-1">
                  A MIDI transformation tool that snaps incoming notes to Ethiopian scales. 
                  Use it in the Clip View to transform melodies, or enable Auto mode for 
                  real-time scale locking while you play.
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs font-mono text-orange-400/60">
                  <span>• 7 Ethiopian scales</span>
                  <span>• Configurable root note</span>
                  <span>• Real-time Auto mode</span>
                </div>

                {/* Download Button */}
                <a
                  href="/Kiñit Scale.zip"
                  download
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[3px] transition-all font-mono text-sm font-medium",
                    "hover:translate-y-[1px] active:translate-y-[2px]",
                    "self-start"
                  )}
                  style={{
                    background: "linear-gradient(180deg, #f97316 0%, #ea580c 100%)",
                    border: "1px solid #fb923c",
                    boxShadow: `
                      inset 0 1px 0 rgba(255,255,255,0.2),
                      inset 0 -1px 2px rgba(0,0,0,0.3),
                      0 2px 4px rgba(0,0,0,0.4),
                      0 4px 8px rgba(0,0,0,0.2)
                    `,
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download for Ableton Live
                </a>
              </div>
            </div>

            {/* Installation hint */}
            <div
              className="mt-4 pt-3 border-t text-xs font-mono text-orange-400/50"
              style={{ borderColor: "rgba(249, 115, 22, 0.2)" }}
            >
              <span className="opacity-70">INSTALL:</span>{" "}
              Copy to <code className="text-orange-400/70">User Library/MIDI Tools/Max Transformations</code>
            </div>
          </LCDScreen>
        </>
      )}

      {/* Quiz Mode */}
      {activeTab === "quiz" && (
        <Quiz onPlayNote={onPlayNote} onStopNote={onStopNote} />
      )}

      {/* Root Note Selector */}
      {activeTab !== "kinit" && activeTab !== "quiz" && (
        <LCDScreen accentColor={scaleInfo?.color} className="py-0">
          <div className="flex items-center gap-4">
            <div
              className="text-[10px] uppercase tracking-[0.15em] font-mono opacity-60 shrink-0"
              style={{ color: scaleInfo?.color || "#10b981" }}
            >
              Root
            </div>

            {/* Notes Grid */}
            <div className="flex-1 space-y-2">
              {/* Natural Notes Row */}
              <div className="flex gap-1">
                {NATURAL_NOTES.map((note) => (
                  <RootNoteButton
                    key={note}
                    note={note}
                    selected={selectedRoot === note}
                    onClick={() => onRootChange(note)}
                    color={scaleInfo?.color}
                  />
                ))}
              </div>

              {/* Sharp Notes Row */}
              <div className="flex gap-1">
                {NATURAL_NOTES.map((note) => {
                  const hasSharp = NOTES_WITH_SHARPS.includes(note);
                  const sharpNote = `${note}#` as RootNote;
                  if (!hasSharp) {
                    return <div key={note} className="w-10 h-8" />;
                  }
                  return (
                    <RootNoteButton
                      key={sharpNote}
                      note={sharpNote}
                      selected={selectedRoot === sharpNote}
                      onClick={() => onRootChange(sharpNote)}
                      color={scaleInfo?.color}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </LCDScreen>
      )}

      {/* Scale Degrees Display */}
      {scaleInfo && scaleNotes.length > 0 && (
        <LCDScreen accentColor={scaleInfo.color} className="py-0">
          <div className="flex items-center gap-3">
            <div
              className="text-[10px] uppercase tracking-[0.15em] font-mono opacity-60 shrink-0"
              style={{ color: scaleInfo.color }}
            >
              Play
            </div>

            {/* Scale degree buttons */}
            <div className="flex gap-1 flex-1">
              {scaleNotes.map(({ note, degree }, i) => (
                <ScaleDegreeButton
                  key={i}
                  note={note}
                  label={degree.label}
                  color={scaleInfo.color}
                  isRoot={i === 0}
                  onMouseDown={() => {
                    const midiNotes = getScaleMidiNotes(
                      currentScaleType!,
                      selectedRoot,
                      4,
                    );
                    onPlayNote?.(midiNotes[i]);
                  }}
                  onMouseUp={() => {
                    const midiNotes = getScaleMidiNotes(
                      currentScaleType!,
                      selectedRoot,
                      4,
                    );
                    onStopNote?.(midiNotes[i]);
                  }}
                />
              ))}
              {/* Octave */}
              <ScaleDegreeButton
                note={scaleNotes[0].note}
                label="8ve"
                color={scaleInfo.color}
                isRoot={false}
                onMouseDown={() => {
                  const midiNotes = getScaleMidiNotes(
                    currentScaleType!,
                    selectedRoot,
                    4,
                  );
                  onPlayNote?.(midiNotes[0] + 12);
                }}
                onMouseUp={() => {
                  const midiNotes = getScaleMidiNotes(
                    currentScaleType!,
                    selectedRoot,
                    4,
                  );
                  onStopNote?.(midiNotes[0] + 12);
                }}
              />
            </div>

            {/* Playback Controls */}
            <div className="flex gap-1 shrink-0">
              <PlaybackButton
                icon="↑"
                title="Play ascending"
                onClick={() => playScale("ascending")}
                color={scaleInfo.color}
              />
              <PlaybackButton
                icon="↓"
                title="Play descending"
                onClick={() => playScale("descending")}
                color={scaleInfo.color}
              />
              <PlaybackButton
                icon="▶"
                title="Play"
                onClick={() => playScale("ascending")}
                color={scaleInfo.color}
                primary
              />
            </div>
          </div>
        </LCDScreen>
      )}
    </div>
  );
}

// Root Note Button Component - MPC tactile rubber button style
function RootNoteButton({
  note,
  selected,
  onClick,
  color,
}: {
  note: RootNote;
  selected: boolean;
  onClick: () => void;
  color?: string;
}) {
  const displayColor = color || "#10b981";
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-10 h-9 text-xs font-mono font-bold transition-all",
        // Outer shell - the button housing
        "rounded-[3px]",
        // 3D tactile effect
        selected
          ? "translate-y-[2px]" // Pressed down
          : "hover:translate-y-[1px] active:translate-y-[2px]",
      )}
      style={{
        // Button background - rubber/silicone look
        background: selected
          ? `linear-gradient(180deg, ${displayColor}90 0%, ${displayColor}70 100%)`
          : `linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #252525 100%)`,
        // Border creates the edge/rim of the button
        border: selected
          ? `1px solid ${displayColor}`
          : "1px solid #1a1a1a",
        // Top highlight + bottom shadow for 3D depth
        boxShadow: selected
          ? `
              inset 0 1px 0 ${displayColor}aa,
              inset 0 -1px 2px rgba(0,0,0,0.4),
              0 1px 2px rgba(0,0,0,0.5)
            `
          : `
              inset 0 1px 0 rgba(255,255,255,0.08),
              inset 0 -1px 2px rgba(0,0,0,0.3),
              0 2px 4px rgba(0,0,0,0.5),
              0 4px 6px rgba(0,0,0,0.3)
            `,
        color: selected ? "#fff" : "#888",
        textShadow: selected ? `0 0 8px ${displayColor}` : "none",
      }}
    >
      {/* LED indicator dot */}
      <div
        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full transition-all"
        style={{
          background: selected
            ? `radial-gradient(circle at 30% 30%, ${displayColor}, ${displayColor}aa)`
            : "radial-gradient(circle at 30% 30%, #444, #333)",
          boxShadow: selected
            ? `0 0 6px ${displayColor}, 0 0 10px ${displayColor}80`
            : "inset 0 1px 2px rgba(0,0,0,0.5)",
        }}
      />
      {/* Button label */}
      <span className="relative z-10">{note}</span>
    </button>
  );
}

// Scale Degree Button Component - MPC pad style
function ScaleDegreeButton({
  note,
  label,
  color,
  isRoot,
  onMouseDown,
  onMouseUp,
}: {
  note: string;
  label: string;
  color: string;
  isRoot: boolean;
  onMouseDown: () => void;
  onMouseUp: () => void;
}) {
  return (
    <button
      className={cn(
        "relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-[3px] transition-all font-mono",
        "active:translate-y-[2px]",
        "hover:translate-y-[1px]",
      )}
      style={{
        // Rubber pad look
        background: isRoot
          ? `linear-gradient(180deg, ${color}95 0%, ${color}75 100%)`
          : `linear-gradient(180deg, ${color}50 0%, ${color}35 50%, ${color}30 100%)`,
        border: `1px solid ${isRoot ? color : `${color}60`}`,
        boxShadow: `
          inset 0 1px 0 ${isRoot ? `${color}bb` : `${color}40`},
          inset 0 -1px 2px rgba(0,0,0,0.3),
          0 2px 4px rgba(0,0,0,0.4),
          0 3px 6px rgba(0,0,0,0.2)
        `,
        color: isRoot ? "#fff" : color,
        textShadow: isRoot ? `0 0 8px ${color}` : "none",
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <span className={cn("text-sm", isRoot && "font-bold")}>
        {note}
      </span>
      <span 
        className="text-[7px] uppercase tracking-wider"
        style={{ opacity: isRoot ? 0.8 : 0.6 }}
      >
        {label}
      </span>
    </button>
  );
}

// Playback Button Component - MPC transport button style
function PlaybackButton({
  icon,
  title,
  onClick,
  color,
  primary,
}: {
  icon: string;
  title: string;
  onClick: () => void;
  color?: string;
  primary?: boolean;
}) {
  const displayColor = color || "#10b981";
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "relative w-8 h-8 rounded-[3px] flex items-center justify-center transition-all font-mono",
        "hover:translate-y-[1px] active:translate-y-[2px]",
        primary ? "text-sm" : "text-xs",
      )}
      style={{
        background: primary
          ? `linear-gradient(180deg, ${displayColor}90 0%, ${displayColor}70 100%)`
          : "linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #252525 100%)",
        border: primary
          ? `1px solid ${displayColor}`
          : "1px solid #1a1a1a",
        boxShadow: primary
          ? `
              inset 0 1px 0 ${displayColor}aa,
              inset 0 -1px 2px rgba(0,0,0,0.4),
              0 2px 4px rgba(0,0,0,0.5),
              0 3px 6px rgba(0,0,0,0.3)
            `
          : `
              inset 0 1px 0 rgba(255,255,255,0.08),
              inset 0 -1px 2px rgba(0,0,0,0.3),
              0 2px 4px rgba(0,0,0,0.5),
              0 3px 6px rgba(0,0,0,0.3)
            `,
        color: primary ? "#fff" : displayColor,
        textShadow: primary ? `0 0 8px ${displayColor}` : "none",
      }}
    >
      {icon}
    </button>
  );
}
