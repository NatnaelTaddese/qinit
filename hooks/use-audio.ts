"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ADSRParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

interface AudioContextRef {
  context: AudioContext | null;
  oscillators: Map<number, OscillatorNode>;
  gainNodes: Map<number, GainNode>;
}

const DEFAULT_ADSR: ADSRParams = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
};

export function useAudio() {
  const audioRef = useRef<AudioContextRef>({
    context: null,
    oscillators: new Map(),
    gainNodes: new Map(),
  });
  const adsrRef = useRef<ADSRParams>(DEFAULT_ADSR);
  const [isReady, setIsReady] = useState(false);
  const [adsr, setAdsr] = useState<ADSRParams>(DEFAULT_ADSR);

  // Keep ref in sync with state
  useEffect(() => {
    adsrRef.current = adsr;
  }, [adsr]);

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
      const existingGainNode = gainNodes.get(noteId);
      if (existingGainNode) {
        const now = context.currentTime;
        existingGainNode.gain.cancelScheduledValues(now);
        existingGainNode.gain.setValueAtTime(existingGainNode.gain.value, now);
        existingGainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
      }
    }

    // Create oscillator
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    // ADSR Envelope - use ref to avoid stale closures
    const now = context.currentTime;
    const adsr = adsrRef.current;
    const maxGain = 0.3;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(maxGain, now + adsr.attack);
    gainNode.gain.exponentialRampToValueAtTime(maxGain * adsr.sustain, now + adsr.attack + adsr.decay);

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
      const adsr = adsrRef.current;
      const now = context.currentTime;
      
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + adsr.release);
      oscillator.stop(now + adsr.release);

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

  return { initAudio, playNote, stopNote, isReady, adsr, setAdsr };
}
