"use client";

import { useCallback, useMemo, useState } from "react";
import { useAudio } from "@/hooks/use-audio";
import { useKeyboard } from "@/hooks/use-keyboard";
import { cn } from "@/lib/utils";
import Scrubber from "@/components/smoothui/scrubber";

interface KeyConfig {
  note: number;
  label: string;
  keyboardKey: string;
  isBlack: boolean;
}

// MIDI note to frequency conversion
function midiNoteToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

const KEYBOARD_CONFIG: KeyConfig[] = [
  // First octave (C4 to B4)
  { note: 60, label: "C", keyboardKey: "a", isBlack: false },
  { note: 61, label: "C#", keyboardKey: "w", isBlack: true },
  { note: 62, label: "D", keyboardKey: "s", isBlack: false },
  { note: 63, label: "D#", keyboardKey: "e", isBlack: true },
  { note: 64, label: "E", keyboardKey: "d", isBlack: false },
  { note: 65, label: "F", keyboardKey: "f", isBlack: false },
  { note: 66, label: "F#", keyboardKey: "t", isBlack: true },
  { note: 67, label: "G", keyboardKey: "g", isBlack: false },
  { note: 68, label: "G#", keyboardKey: "y", isBlack: true },
  { note: 69, label: "A", keyboardKey: "h", isBlack: false },
  { note: 70, label: "A#", keyboardKey: "u", isBlack: true },
  { note: 71, label: "B", keyboardKey: "j", isBlack: false },
  // Second octave (C5 to E5)
  { note: 72, label: "C", keyboardKey: "k", isBlack: false },
  { note: 73, label: "C#", keyboardKey: "o", isBlack: true },
  { note: 74, label: "D", keyboardKey: "l", isBlack: false },
  { note: 75, label: "D#", keyboardKey: "p", isBlack: true },
  { note: 76, label: "E", keyboardKey: ";", isBlack: false },
];

interface PianoKeyboardProps {
  className?: string;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

export function PianoKeyboard({
  className,
  onCollapseChange,
}: PianoKeyboardProps) {
  const { initAudio, playNote, stopNote, isReady, adsr, setAdsr } = useAudio();
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [showKeyboardLabels, setShowKeyboardLabels] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNoteOn = useCallback(
    (note: number) => {
      if (!activeNotes.has(note)) {
        playNote(midiNoteToFrequency(note), note);
        setActiveNotes((prev) => new Set([...prev, note]));
      }
    },
    [activeNotes, playNote],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      stopNote(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    },
    [stopNote],
  );

  // Keyboard support
  const { activeKeys } = useKeyboard(
    useCallback(
      (note) => {
        initAudio();
        handleNoteOn(note);
      },
      [handleNoteOn, initAudio],
    ),
    handleNoteOff,
  );

  const whiteKeys = useMemo(
    () => KEYBOARD_CONFIG.filter((k) => !k.isBlack),
    [],
  );
  const blackKeys = useMemo(() => KEYBOARD_CONFIG.filter((k) => k.isBlack), []);

  const handleMouseDown = (note: number) => {
    initAudio();
    handleNoteOn(note);
  };

  const handleMouseUp = (note: number) => {
    handleNoteOff(note);
  };

  const handleMouseLeave = (note: number) => {
    if (activeNotes.has(note)) {
      handleNoteOff(note);
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm transition-all duration-300 ease-in-out",
        isCollapsed ? "h-12" : "h-[320px]",
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col px-4">
        {/* Collapse Toggle Bar */}
        <button
          onClick={() => {
            setIsCollapsed((prev) => {
              const newState = !prev;
              onCollapseChange?.(newState);
              return newState;
            });
          }}
          className="flex h-12 w-full items-center justify-between border-b border-border px-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-300",
                !isCollapsed && "rotate-180",
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <span className="text-sm font-medium text-foreground">
              Piano Keyboard
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {isCollapsed ? "Click to expand" : "Click to collapse"}
          </span>
        </button>

        {/* Keyboard Content */}
        <div
          className={cn(
            "flex flex-1 gap-4 overflow-visible py-4 transition-opacity duration-300 justify-around items-center",
            isCollapsed ? "opacity-0" : "opacity-100",
          )}
        >
          {/* Keyboard - Left Side */}
          <div className="relative  select-none">
            {/* White keys container */}
            <div
              id="white-keys-container"
              className="flex h-40 justify-center gap-0.5"
            >
              {whiteKeys.map((key) => (
                <div key={key.note} className="relative" style={{ width: 48 }}>
                  <PianoKeyWhite
                    config={key}
                    isActive={activeNotes.has(key.note)}
                    isKeyboardActive={activeKeys.has(key.keyboardKey)}
                    showLabel={showKeyboardLabels}
                    onMouseDown={() => handleMouseDown(key.note)}
                    onMouseUp={() => handleMouseUp(key.note)}
                    onMouseLeave={() => handleMouseLeave(key.note)}
                  />
                </div>
              ))}
            </div>

            {/* Black keys */}
            <div className="pointer-events-none absolute left-0 right-0 top-0 flex h-[72px] justify-center gap-0.5">
              {whiteKeys.map((key, index) => {
                const nextWhiteNote = whiteKeys[index + 1]?.note;
                const blackKey = blackKeys.find(
                  (bk) =>
                    bk.note > key.note && bk.note < (nextWhiteNote || Infinity),
                );

                if (!blackKey) {
                  return (
                    <div key={`empty-${key.note}`} style={{ width: 48 }} />
                  );
                }

                return (
                  <div
                    key={`black-${blackKey.note}`}
                    className="relative"
                    style={{ width: 48 }}
                  >
                    <div
                      className="pointer-events-auto absolute top-0 z-20"
                      style={{
                        left: "100%",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <PianoKeyBlack
                        config={blackKey}
                        isActive={activeNotes.has(blackKey.note)}
                        isKeyboardActive={activeKeys.has(blackKey.keyboardKey)}
                        showLabel={showKeyboardLabels}
                        onMouseDown={() => handleMouseDown(blackKey.note)}
                        onMouseUp={() => handleMouseUp(blackKey.note)}
                        onMouseLeave={() => handleMouseLeave(blackKey.note)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls Panel - Right Side */}
          <div className="flex h-fit w-72 shrink-0 flex-col gap-2">
            {/* ADSR Controls - Two rows */}
            <div className="flex flex-1 gap-2">
              {/* Row 1: Attack & Decay */}
              <div className="flex flex-1 flex-col gap-2">
                <Scrubber
                  label="Attack"
                  value={adsr.attack}
                  onValueChange={(value) =>
                    setAdsr((prev) => ({ ...prev, attack: value }))
                  }
                  min={0.001}
                  max={1}
                  step={0.001}
                  decimals={2}
                  ticks={0}
                />
                <Scrubber
                  label="Decay"
                  value={adsr.decay}
                  onValueChange={(value) =>
                    setAdsr((prev) => ({ ...prev, decay: value }))
                  }
                  min={0.001}
                  max={1}
                  step={0.001}
                  decimals={2}
                  ticks={0}
                />
              </div>
              {/* Row 2: Sustain & Release */}
              <div className="flex flex-1 flex-col gap-2">
                <Scrubber
                  label="Sustain"
                  value={adsr.sustain}
                  onValueChange={(value) =>
                    setAdsr((prev) => ({ ...prev, sustain: value }))
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  decimals={2}
                  ticks={0}
                />
                <Scrubber
                  label="Release"
                  value={adsr.release}
                  onValueChange={(value) =>
                    setAdsr((prev) => ({ ...prev, release: value }))
                  }
                  min={0.01}
                  max={2}
                  step={0.01}
                  decimals={2}
                  ticks={0}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PianoKeyProps {
  config: KeyConfig;
  isActive: boolean;
  isKeyboardActive: boolean;
  showLabel: boolean;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

function PianoKeyWhite({
  config,
  isActive,
  isKeyboardActive,
  showLabel,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
}: PianoKeyProps) {
  return (
    <button
      className={cn(
        "group relative flex h-full w-full flex-col items-center justify-end rounded-b-[2px] border bg-gradient-to-b from-white via-white to-gray-50 pb-3 transition-all",
        "border-gray-300 border-b-[6px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
        "active:border-b-[2px] active:translate-y-[4px] active:shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.1)]",
        isActive &&
          "bg-gradient-to-b from-blue-50 via-blue-50 to-blue-100 border-blue-400 border-b-blue-500",
        isKeyboardActive && "ring-2 ring-primary ring-inset",
      )}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onMouseUp();
      }}
    >
      {/* Top highlight for depth */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-white/80" />

      <span
        className={cn(
          "text-xs font-medium text-gray-400",
          isActive && "text-blue-600",
        )}
      >
        {config.label}
      </span>
      {showLabel && (
        <span
          className={cn(
            "mt-1 text-[10px] uppercase text-gray-300",
            isActive && "text-blue-400",
          )}
        >
          {config.keyboardKey}
        </span>
      )}
    </button>
  );
}

function PianoKeyBlack({
  config,
  isActive,
  isKeyboardActive,
  showLabel,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
}: PianoKeyProps) {
  if (!config) return null;

  return (
    <button
      className={cn(
        "group relative flex h-[82px] w-8 flex-col items-center justify-end rounded-b-[2px] border pb-2 transition-all",
        "border-gray-950 border-b-[5px] bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900",
        "shadow-[0_6px_8px_-2px_rgba(0,0,0,0.4),0_4px_6px_-2px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        "active:border-b-[2px] active:translate-y-[3px] active:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(0,0,0,0.4)]",
        isActive &&
          "bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 border-blue-950",
        isKeyboardActive && "ring-2 ring-primary ring-inset",
      )}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onMouseUp();
      }}
    >
      {/* Top highlight for depth */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gray-600/50" />

      <span
        className={cn(
          "text-[10px] font-medium text-gray-500",
          isActive && "text-blue-300",
        )}
      >
        {config.label}
      </span>
      {showLabel && (
        <span
          className={cn(
            "mt-1 text-[8px] uppercase text-gray-600",
            isActive && "text-blue-400",
          )}
        >
          {config.keyboardKey}
        </span>
      )}
    </button>
  );
}
