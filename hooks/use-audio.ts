"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AudioContextRef {
  context: AudioContext | null;
  oscillators: Map<number, OscillatorNode>;
  gainNodes: Map<number, GainNode>;
}

export function useAudio() {
  const audioRef = useRef<AudioContextRef>({
    context: null,
    oscillators: new Map(),
    gainNodes: new Map(),
  });
  const [isReady, setIsReady] = useState(false);

  const initAudio = useCallback(() => {
    if (!audioRef.current.context) {
      audioRef.current.context = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      setIsReady(true);
    }
    if (audioRef.current.context.state === "suspended") {
      audioRef.current.context.resume();
    }
  }, []);

  // Auto-initialize audio on mount
  useEffect(() => {
    if (!audioRef.current.context) {
      audioRef.current.context = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      setIsReady(true);
    }
  }, []);

  // Auto-resume on user interaction
  useEffect(() => {
    const resume = () => {
      if (audioRef.current.context?.state === "suspended") {
        audioRef.current.context.resume();
      }
    };

    window.addEventListener("click", resume);
    window.addEventListener("keydown", resume);

    return () => {
      window.removeEventListener("click", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);

  const playNote = useCallback((frequency: number, noteId: number) => {
    const { context, oscillators, gainNodes } = audioRef.current;
    if (!context) return;

    // Stop existing note if playing
    if (oscillators.has(noteId)) {
      stopNote(noteId);
    }

    // Create oscillator
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    // Envelope
    const now = context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.1);

    oscillator.start(now);

    oscillators.set(noteId, oscillator);
    gainNodes.set(noteId, gainNode);
  }, []);

  const stopNote = useCallback((noteId: number) => {
    const { context, oscillators, gainNodes } = audioRef.current;
    if (!context) return;

    const oscillator = oscillators.get(noteId);
    const gainNode = gainNodes.get(noteId);

    if (oscillator && gainNode) {
      const now = context.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      oscillator.stop(now + 0.1);

      oscillators.delete(noteId);
      gainNodes.delete(noteId);
    }
  }, []);

  useEffect(() => {
    return () => {
      const { oscillators } = audioRef.current;
      oscillators.forEach((_, noteId) => stopNote(noteId));
      audioRef.current.context?.close();
    };
  }, [stopNote]);

  return { initAudio, playNote, stopNote, isReady };
}
