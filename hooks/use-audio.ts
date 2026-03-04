"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ADSRParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export type WaveformType = "sine" | "square" | "sawtooth" | "triangle";

export interface SoundParams {
  waveform: WaveformType;
  unison: number;
  spread: number;
  dryWet: number;
}

export interface FilterParams {
  highpassFreq: number;
  highpassQ: number;
  lowpassFreq: number;
  lowpassQ: number;
}

export interface EffectsParams {
  reverbMix: number;
  reverbDecay: number;
  delayMix: number;
  delayTime: number;
  delayFeedback: number;
}

interface AudioContextRef {
  context: AudioContext | null;
  oscillators: Map<number, OscillatorNode[]>;
  gainNodes: Map<number, GainNode>;
  // Filter nodes
  highpassFilter: BiquadFilterNode | null;
  lowpassFilter: BiquadFilterNode | null;
  // Effects nodes
  reverbNode: ConvolverNode | null;
  reverbGain: GainNode | null;
  delayNode: DelayNode | null;
  delayFeedbackGain: GainNode | null;
  delayMixGain: GainNode | null;
  dryGain: GainNode | null;
  masterGain: GainNode | null;
}

const DEFAULT_ADSR: ADSRParams = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
};

const DEFAULT_SOUND: SoundParams = {
  waveform: "triangle",
  unison: 1,
  spread: 10,
  dryWet: 0,
};

const DEFAULT_FILTER: FilterParams = {
  highpassFreq: 20,
  highpassQ: 0.7,
  lowpassFreq: 20000,
  lowpassQ: 0.7,
};

const DEFAULT_EFFECTS: EffectsParams = {
  reverbMix: 0.2,
  reverbDecay: 2,
  delayMix: 0,
  delayTime: 0.3,
  delayFeedback: 0.4,
};

// Create impulse response for reverb
function createReverbImpulse(
  context: AudioContext,
  duration: number,
  decay: number
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const impulse = context.createBuffer(2, length, sampleRate);
  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = i / length;
    // Exponential decay with some randomness for natural sound
    const envelope = Math.pow(1 - n, decay);
    leftChannel[i] = (Math.random() * 2 - 1) * envelope;
    rightChannel[i] = (Math.random() * 2 - 1) * envelope;
  }

  return impulse;
}

export function useAudio() {
  const audioRef = useRef<AudioContextRef>({
    context: null,
    oscillators: new Map(),
    gainNodes: new Map(),
    highpassFilter: null,
    lowpassFilter: null,
    reverbNode: null,
    reverbGain: null,
    delayNode: null,
    delayFeedbackGain: null,
    delayMixGain: null,
    dryGain: null,
    masterGain: null,
  });
  const adsrRef = useRef<ADSRParams>(DEFAULT_ADSR);
  const soundRef = useRef<SoundParams>(DEFAULT_SOUND);
  const filterRef = useRef<FilterParams>(DEFAULT_FILTER);
  const effectsRef = useRef<EffectsParams>(DEFAULT_EFFECTS);
  const [isReady, setIsReady] = useState(false);
  const [adsr, setAdsr] = useState<ADSRParams>(DEFAULT_ADSR);
  const [sound, setSound] = useState<SoundParams>(DEFAULT_SOUND);
  const [filter, setFilter] = useState<FilterParams>(DEFAULT_FILTER);
  const [effects, setEffects] = useState<EffectsParams>(DEFAULT_EFFECTS);

  // Keep refs in sync with state
  useEffect(() => {
    adsrRef.current = adsr;
  }, [adsr]);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    effectsRef.current = effects;
  }, [effects]);

  // Update filter parameters in real-time
  useEffect(() => {
    const { highpassFilter, lowpassFilter } = audioRef.current;
    
    if (highpassFilter) {
      highpassFilter.frequency.value = filter.highpassFreq;
      highpassFilter.Q.value = filter.highpassQ;
    }
    if (lowpassFilter) {
      lowpassFilter.frequency.value = filter.lowpassFreq;
      lowpassFilter.Q.value = filter.lowpassQ;
    }
  }, [filter]);

  // Update effects parameters in real-time
  useEffect(() => {
    const { reverbGain, delayNode, delayFeedbackGain, delayMixGain, dryGain } = audioRef.current;
    
    if (reverbGain) {
      reverbGain.gain.value = effects.reverbMix;
    }
    if (dryGain) {
      dryGain.gain.value = 1 - Math.max(effects.reverbMix, effects.delayMix) * 0.5;
    }
    if (delayNode) {
      delayNode.delayTime.value = effects.delayTime;
    }
    if (delayFeedbackGain) {
      delayFeedbackGain.gain.value = effects.delayFeedback;
    }
    if (delayMixGain) {
      delayMixGain.gain.value = effects.delayMix;
    }
  }, [effects]);

  // Update reverb impulse when decay changes
  useEffect(() => {
    const { context, reverbNode } = audioRef.current;
    if (context && reverbNode) {
      reverbNode.buffer = createReverbImpulse(context, 3, effects.reverbDecay);
    }
  }, [effects.reverbDecay]);

  const initAudio = useCallback(() => {
    if (!audioRef.current.context) {
      const context = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioRef.current.context = context;

      // Create master gain
      const masterGain = context.createGain();
      masterGain.gain.value = 0.8;
      masterGain.connect(context.destination);
      audioRef.current.masterGain = masterGain;

      // Create filters
      const highpassFilter = context.createBiquadFilter();
      highpassFilter.type = "highpass";
      highpassFilter.frequency.value = filterRef.current.highpassFreq;
      highpassFilter.Q.value = filterRef.current.highpassQ;
      audioRef.current.highpassFilter = highpassFilter;

      const lowpassFilter = context.createBiquadFilter();
      lowpassFilter.type = "lowpass";
      lowpassFilter.frequency.value = filterRef.current.lowpassFreq;
      lowpassFilter.Q.value = filterRef.current.lowpassQ;
      audioRef.current.lowpassFilter = lowpassFilter;

      // Chain filters: highpass -> lowpass -> rest of chain
      highpassFilter.connect(lowpassFilter);

      // Create dry gain (after filters)
      const dryGain = context.createGain();
      dryGain.gain.value = 1;
      lowpassFilter.connect(dryGain);
      dryGain.connect(masterGain);
      audioRef.current.dryGain = dryGain;

      // Create reverb (fed from after filters)
      const reverbNode = context.createConvolver();
      reverbNode.buffer = createReverbImpulse(context, 3, effectsRef.current.reverbDecay);
      const reverbGain = context.createGain();
      reverbGain.gain.value = effectsRef.current.reverbMix;
      lowpassFilter.connect(reverbNode);
      reverbNode.connect(reverbGain);
      reverbGain.connect(masterGain);
      audioRef.current.reverbNode = reverbNode;
      audioRef.current.reverbGain = reverbGain;

      // Create delay (fed from after filters)
      const delayNode = context.createDelay(2);
      delayNode.delayTime.value = effectsRef.current.delayTime;
      
      const delayFeedbackGain = context.createGain();
      delayFeedbackGain.gain.value = effectsRef.current.delayFeedback;
      
      const delayMixGain = context.createGain();
      delayMixGain.gain.value = effectsRef.current.delayMix;

      // Delay feedback loop
      delayNode.connect(delayFeedbackGain);
      delayFeedbackGain.connect(delayNode);
      
      // Delay output
      lowpassFilter.connect(delayNode);
      delayNode.connect(delayMixGain);
      delayMixGain.connect(masterGain);

      audioRef.current.delayNode = delayNode;
      audioRef.current.delayFeedbackGain = delayFeedbackGain;
      audioRef.current.delayMixGain = delayMixGain;

      setIsReady(true);
    }
    if (audioRef.current.context.state === "suspended") {
      audioRef.current.context.resume();
    }
  }, []);

  // Auto-initialize audio on mount
  useEffect(() => {
    initAudio();
  }, [initAudio]);

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
    const { context, oscillators, gainNodes, highpassFilter } = audioRef.current;
    if (!context || !highpassFilter) return;

    // Stop existing note if playing
    if (oscillators.has(noteId)) {
      const existingOscillators = oscillators.get(noteId);
      const existingGainNode = gainNodes.get(noteId);
      if (existingOscillators && existingGainNode) {
        const now = context.currentTime;
        existingGainNode.gain.cancelScheduledValues(now);
        existingGainNode.gain.setValueAtTime(existingGainNode.gain.value, now);
        existingGainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        existingOscillators.forEach((osc) => osc.stop(now + 0.01));
      }
    }

    const sound = soundRef.current;
    const adsr = adsrRef.current;
    const now = context.currentTime;
    const maxGain = 0.3;

    // Create gain node for envelope
    const gainNode = context.createGain();

    // Create oscillators for unison
    const oscillatorArray: OscillatorNode[] = [];
    const numOscillators = Math.max(1, Math.round(sound.unison));
    const spread = sound.spread;

    for (let i = 0; i < numOscillators; i++) {
      const oscillator = context.createOscillator();
      oscillator.type = sound.waveform;
      
      // Calculate detune for spread
      const detune = spread * (i - (numOscillators - 1) / 2);
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;

      oscillator.connect(gainNode);
      oscillator.start(now);
      oscillatorArray.push(oscillator);
    }

    // ADSR Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(maxGain, now + adsr.attack);
    gainNode.gain.exponentialRampToValueAtTime(
      Math.max(maxGain * adsr.sustain, 0.001),
      now + adsr.attack + adsr.decay
    );

    // Connect to filter chain (highpass is the entry point)
    gainNode.connect(highpassFilter);

    oscillators.set(noteId, oscillatorArray);
    gainNodes.set(noteId, gainNode);
  }, []);

  const stopNote = useCallback((noteId: number) => {
    const { context, oscillators, gainNodes } = audioRef.current;
    if (!context) return;

    const oscillatorArray = oscillators.get(noteId);
    const gainNode = gainNodes.get(noteId);

    if (oscillatorArray && gainNode) {
      const adsr = adsrRef.current;
      const now = context.currentTime;
      
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + adsr.release);
      
      oscillatorArray.forEach((osc) => osc.stop(now + adsr.release));

      oscillators.delete(noteId);
      gainNodes.delete(noteId);
    }
  }, []);

  useEffect(() => {
    return () => {
      const { oscillators } = audioRef.current;
      oscillators.forEach((oscArray) => {
        oscArray.forEach((osc) => osc.stop());
      });
      audioRef.current.context?.close();
    };
  }, []);

  return { 
    initAudio, 
    playNote, 
    stopNote, 
    isReady, 
    adsr, 
    setAdsr, 
    sound, 
    setSound, 
    filter, 
    setFilter, 
    effects, 
    setEffects 
  };
}
