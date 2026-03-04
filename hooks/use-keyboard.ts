"use client";

import { useEffect, useCallback, useState } from "react";

interface KeyboardMapping {
  key: string;
  note: number;
  label: string;
}

// Map computer keyboard keys to MIDI notes
// Starting from C4 (MIDI note 60)
const KEYBOARD_MAPPINGS: KeyboardMapping[] = [
  { key: "a", note: 60, label: "C" },      // C4
  { key: "w", note: 61, label: "C#" },     // C#4
  { key: "s", note: 62, label: "D" },      // D4
  { key: "e", note: 63, label: "D#" },     // D#4
  { key: "d", note: 64, label: "E" },      // E4
  { key: "f", note: 65, label: "F" },      // F4
  { key: "t", note: 66, label: "F#" },     // F#4
  { key: "g", note: 67, label: "G" },      // G4
  { key: "y", note: 68, label: "G#" },     // G#4
  { key: "h", note: 69, label: "A" },      // A4
  { key: "u", note: 70, label: "A#" },     // A#4
  { key: "j", note: 71, label: "B" },      // B4
  { key: "k", note: 72, label: "C" },      // C5
  { key: "o", note: 73, label: "C#" },     // C#5
  { key: "l", note: 74, label: "D" },      // D5
  { key: "p", note: 75, label: "D#" },     // D#5
  { key: ";", note: 76, label: "E" },      // E5
];

export function useKeyboard(
  onNoteOn: (note: number) => void,
  onNoteOff: (note: number) => void
) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  const getNoteFromKey = useCallback((key: string): number | null => {
    const mapping = KEYBOARD_MAPPINGS.find((m) => m.key === key.toLowerCase());
    return mapping?.note ?? null;
  }, []);

  const getKeyFromNote = useCallback((note: number): string | null => {
    const mapping = KEYBOARD_MAPPINGS.find((m) => m.note === note);
    return mapping?.key ?? null;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.repeat) return;

      const note = getNoteFromKey(event.key);
      if (note !== null && !activeKeys.has(event.key.toLowerCase())) {
        onNoteOn(note);
        setActiveKeys((prev) => new Set([...prev, event.key.toLowerCase()]));
      }
    },
    [getNoteFromKey, onNoteOn, activeKeys]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      const note = getNoteFromKey(event.key);
      if (note !== null) {
        onNoteOff(note);
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(event.key.toLowerCase());
          return next;
        });
      }
    },
    [getNoteFromKey, onNoteOff]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    activeKeys,
    keyboardMappings: KEYBOARD_MAPPINGS,
    getNoteFromKey,
    getKeyFromNote,
  };
}
