"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useAudio, WaveformType } from "@/hooks/use-audio";
import { useKeyboard } from "@/hooks/use-keyboard";
import { cn } from "@/lib/utils";
import { useDialKit } from "dialkit";
import {
  ScaleType,
  RootNote,
  SCALE_INFO,
  isMidiNoteInScale,
  isMidiRootNote,
} from "@/lib/scales";

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
  selectedScale: ScaleType | null;
  selectedRoot: RootNote;
  playbackNotes?: Set<number>;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

export function PianoKeyboard({
  className,
  selectedScale,
  selectedRoot,
  playbackNotes = new Set(),
  onCollapseChange,
}: PianoKeyboardProps) {
  const { initAudio, playNote, stopNote, isReady, adsr, setAdsr, sound, setSound, filter, setFilter, effects, setEffects } = useAudio();
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [showKeyboardLabels, setShowKeyboardLabels] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // DialKit for synth parameter tweaking
  const params = useDialKit("Synth", {
    envelope: {
      attack: [adsr.attack, 0.001, 1, 0.001],
      decay: [adsr.decay, 0.001, 1, 0.001],
      sustain: [adsr.sustain, 0, 1, 0.01],
      release: [adsr.release, 0.01, 2, 0.01],
    },
    sound: {
      waveform: {
        type: "select" as const,
        options: [
          { value: "sine", label: "Sine" },
          { value: "square", label: "Square" },
          { value: "sawtooth", label: "Sawtooth" },
          { value: "triangle", label: "Triangle" },
        ],
        default: sound.waveform,
      },
      unison: [sound.unison, 1, 5, 1],
      spread: [sound.spread, 0, 100, 1],
    },
    filter: {
      highpass: {
        freq: [filter.highpassFreq, 20, 5000, 1],
        Q: [filter.highpassQ, 0.1, 10, 0.1],
      },
      lowpass: {
        freq: [filter.lowpassFreq, 200, 20000, 1],
        Q: [filter.lowpassQ, 0.1, 10, 0.1],
      },
    },
    effects: {
      reverb: {
        mix: [effects.reverbMix, 0, 1, 0.01],
        decay: [effects.reverbDecay, 0.5, 5, 0.1],
      },
      delay: {
        mix: [effects.delayMix, 0, 1, 0.01],
        time: [effects.delayTime, 0.05, 1, 0.01],
        feedback: [effects.delayFeedback, 0, 0.9, 0.01],
      },
    },
  });

  // Sync DialKit params back to audio state
  useEffect(() => {
    setAdsr({
      attack: params.envelope.attack,
      decay: params.envelope.decay,
      sustain: params.envelope.sustain,
      release: params.envelope.release,
    });
  }, [params.envelope.attack, params.envelope.decay, params.envelope.sustain, params.envelope.release, setAdsr]);

  useEffect(() => {
    setSound({
      waveform: params.sound.waveform as WaveformType,
      unison: params.sound.unison,
      spread: params.sound.spread,
      dryWet: 0,
    });
  }, [params.sound.waveform, params.sound.unison, params.sound.spread, setSound]);

  useEffect(() => {
    setFilter({
      highpassFreq: params.filter.highpass.freq,
      highpassQ: params.filter.highpass.Q,
      lowpassFreq: params.filter.lowpass.freq,
      lowpassQ: params.filter.lowpass.Q,
    });
  }, [
    params.filter.highpass.freq,
    params.filter.highpass.Q,
    params.filter.lowpass.freq,
    params.filter.lowpass.Q,
    setFilter,
  ]);

  useEffect(() => {
    setEffects({
      reverbMix: params.effects.reverb.mix,
      reverbDecay: params.effects.reverb.decay,
      delayMix: params.effects.delay.mix,
      delayTime: params.effects.delay.time,
      delayFeedback: params.effects.delay.feedback,
    });
  }, [
    params.effects.reverb.mix,
    params.effects.reverb.decay,
    params.effects.delay.mix,
    params.effects.delay.time,
    params.effects.delay.feedback,
    setEffects,
  ]);

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

  const scaleColor = selectedScale ? SCALE_INFO[selectedScale].color : null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm transition-all duration-300 ease-in-out border-t border-white/5",
        isCollapsed ? "h-12" : "h-[280px]",
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
          className="flex h-12 w-full items-center justify-between px-2 hover:bg-muted/50 transition-colors"
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
            {selectedScale && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${scaleColor}20`,
                  color: scaleColor || undefined,
                }}
              >
                {SCALE_INFO[selectedScale].name} in {selectedRoot}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {isCollapsed ? "Click to expand" : "Click to collapse"}
          </span>
        </button>

        {/* Keyboard Content */}
        <div
          className={cn(
            "flex flex-1 overflow-visible py-4 transition-opacity duration-300 justify-center items-center",
            isCollapsed ? "opacity-0" : "opacity-100",
          )}
        >
          {/* Piano Keyboard */}
          <div className="relative select-none">
            {/* White keys container */}
            <div
              id="white-keys-container"
              className="flex h-40 justify-center gap-0.5"
            >
              {whiteKeys.map((key) => {
                const isInScale = selectedScale ? isMidiNoteInScale(key.note, selectedScale, selectedRoot) : false;
                const isRoot = selectedScale ? isMidiRootNote(key.note, selectedRoot) : false;
                const isPlaybackActive = playbackNotes.has(key.note) || playbackNotes.has(key.note + 12) || playbackNotes.has(key.note - 12);
                
                return (
                  <div key={key.note} className="relative" style={{ width: 48 }}>
                    <PianoKeyWhite
                      config={key}
                      isActive={activeNotes.has(key.note)}
                      isPressed={isPlaybackActive}
                      isKeyboardActive={activeKeys.has(key.keyboardKey)}
                      showLabel={showKeyboardLabels}
                      isInScale={isInScale}
                      isRoot={isRoot}
                      scaleColor={scaleColor}
                      onMouseDown={() => handleMouseDown(key.note)}
                      onMouseUp={() => handleMouseUp(key.note)}
                      onMouseLeave={() => handleMouseLeave(key.note)}
                    />
                  </div>
                );
              })}
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

                const isInScale = selectedScale ? isMidiNoteInScale(blackKey.note, selectedScale, selectedRoot) : false;
                const isRoot = selectedScale ? isMidiRootNote(blackKey.note, selectedRoot) : false;
                const isPlaybackActive = playbackNotes.has(blackKey.note) || playbackNotes.has(blackKey.note + 12) || playbackNotes.has(blackKey.note - 12);

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
                        isPressed={isPlaybackActive}
                        isKeyboardActive={activeKeys.has(blackKey.keyboardKey)}
                        showLabel={showKeyboardLabels}
                        isInScale={isInScale}
                        isRoot={isRoot}
                        scaleColor={scaleColor}
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
        </div>
      </div>
    </div>
  );
}

interface PianoKeyProps {
  config: KeyConfig;
  isActive: boolean;
  isPressed: boolean;
  isKeyboardActive: boolean;
  showLabel: boolean;
  isInScale: boolean;
  isRoot: boolean;
  scaleColor: string | null;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

function PianoKeyWhite({
  config,
  isActive,
  isPressed,
  isKeyboardActive,
  showLabel,
  isInScale,
  isRoot,
  scaleColor,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
}: PianoKeyProps) {
  // Combine all "pressed" states - mouse active, keyboard active, or playback
  const isPressedDown = isActive || isPressed;
  
  return (
    <button
      className={cn(
        "group relative flex h-full w-full flex-col items-center justify-end rounded-b-[2px] border bg-gradient-to-b from-white via-white to-gray-50 pb-3 transition-all",
        "border-gray-300 border-b-[6px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
        "active:border-b-[2px] active:translate-y-[4px] active:shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.1)]",
        // Pressed state (for playback, mouse press, or keyboard press)
        isPressedDown && "border-b-[2px] translate-y-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.1)]",
        // Ring indicator for keyboard input
        isKeyboardActive && "ring-2 ring-primary ring-inset",
      )}
      style={isInScale && scaleColor ? {
        background: isRoot 
          ? `linear-gradient(to bottom, ${scaleColor}40, ${scaleColor}60)` 
          : `linear-gradient(to bottom, ${scaleColor}20, ${scaleColor}30)`,
        borderColor: scaleColor,
        borderBottomColor: scaleColor,
      } : undefined}
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
      
      {/* Root indicator dot */}
      {isRoot && scaleColor && (
        <div 
          className="absolute top-2 w-2 h-2 rounded-full"
          style={{ backgroundColor: scaleColor }}
        />
      )}

      <span
        className={cn(
          "text-xs font-medium text-gray-400",
          isPressedDown && "text-blue-600",
        )}
        style={isInScale && scaleColor ? { color: scaleColor } : undefined}
      >
        {config.label}
      </span>
      {showLabel && (
        <span
          className={cn(
            "mt-1 text-[10px] uppercase text-gray-300",
            isPressedDown && "text-blue-400",
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
  isPressed,
  isKeyboardActive,
  showLabel,
  isInScale,
  isRoot,
  scaleColor,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
}: PianoKeyProps) {
  if (!config) return null;

  // Combine all "pressed" states - mouse active, keyboard active, or playback
  const isPressedDown = isActive || isPressed;

  return (
    <button
      className={cn(
        "group relative flex h-[82px] w-8 flex-col items-center justify-end rounded-b-[2px] border pb-2 transition-all",
        "border-gray-950 border-b-[5px] bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900",
        "shadow-[0_6px_8px_-2px_rgba(0,0,0,0.4),0_4px_6px_-2px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        "active:border-b-[2px] active:translate-y-[3px] active:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(0,0,0,0.4)]",
        // Pressed state (for playback, mouse press, or keyboard press)
        isPressedDown && "border-b-[2px] translate-y-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(0,0,0,0.4)]",
        isPressedDown && !isInScale &&
          "bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 border-blue-950",
        // Ring indicator for keyboard input
        isKeyboardActive && "ring-2 ring-primary ring-inset",
        isInScale && "backdrop-blur-sm",
      )}
      style={isInScale && scaleColor ? {
        background: isRoot 
          ? `linear-gradient(to bottom, ${scaleColor}, ${scaleColor}cc)` 
          : `linear-gradient(to bottom, ${scaleColor}80, ${scaleColor}60)`,
        borderColor: `${scaleColor}cc`,
        borderBottomColor: scaleColor,
        boxShadow: `0 6px 8px -2px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 0 20px rgba(0,0,0,0.3)`,
      } : undefined}
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
      <div className={cn(
        "absolute inset-x-0 top-0 h-[1px]",
        isInScale ? "bg-white/30" : "bg-gray-600/50"
      )} />
      
      {/* Inner shadow overlay for depth on colored keys */}
      {isInScale && (
        <div className="absolute inset-0 rounded-b-[2px] bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none" />
      )}
      
      {/* Root indicator dot */}
      {isRoot && scaleColor && (
        <div 
          className="absolute top-2 w-2 h-2 rounded-full bg-white shadow-sm"
        />
      )}

      <span
        className={cn(
          "text-[10px] font-medium text-gray-500",
          isPressedDown && "text-blue-300",
          isInScale && "text-white",
        )}
      >
        {config.label}
      </span>
      {showLabel && (
        <span
          className={cn(
            "mt-1 text-[8px] uppercase text-gray-600",
            isPressedDown && "text-blue-400",
            isInScale && "text-white/70",
          )}
        >
          {config.keyboardKey}
        </span>
      )}
    </button>
  );
}
