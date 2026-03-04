"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface MIDINote {
  note: number;
  velocity: number;
}

interface MIDIState {
  isSupported: boolean;
  devices: Array<{ id: string; name: string; manufacturer: string }>;
  activeNotes: Set<number>;
  selectedDevice: string | null;
}

export function useMIDI(
  onNoteOn: (note: MIDINote) => void,
  onNoteOff: (note: number) => void
) {
  const [state, setState] = useState<MIDIState>({
    isSupported: false,
    devices: [],
    activeNotes: new Set(),
    selectedDevice: null,
  });
  const accessRef = useRef<unknown>(null);

  const handleMIDIMessage = useCallback(
    (event: { data: Uint8Array }) => {
      const [command, note, velocity] = event.data;
      const messageType = command & 0xf0;

      switch (messageType) {
        case 0x90: // Note on
          if (velocity > 0) {
            onNoteOn({ note, velocity });
            setState((prev) => ({
              ...prev,
              activeNotes: new Set([...prev.activeNotes, note]),
            }));
          } else {
            onNoteOff(note);
            setState((prev) => ({
              ...prev,
              activeNotes: new Set(
                [...prev.activeNotes].filter((n) => n !== note)
              ),
            }));
          }
          break;
        case 0x80: // Note off
          onNoteOff(note);
          setState((prev) => ({
            ...prev,
            activeNotes: new Set(
              [...prev.activeNotes].filter((n) => n !== note)
            ),
          }));
          break;
      }
    },
    [onNoteOn, onNoteOff]
  );

  const initMIDI = useCallback(async () => {
    if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) {
      return;
    }

    try {
      const access = await (navigator as unknown as { requestMIDIAccess: (options?: { sysex?: boolean }) => Promise<unknown> }).requestMIDIAccess({ sysex: false });
      accessRef.current = access;

      const inputs: Array<{ id: string; name: string; manufacturer: string; onmidimessage: unknown }> = [];
      (access as { inputs: { forEach: (callback: (input: { id: string; name: string; manufacturer: string; onmidimessage: unknown }) => void) => void } }).inputs.forEach((input) => {
        inputs.push(input);
        (input as { onmidimessage: unknown }).onmidimessage = handleMIDIMessage;
      });

      setState((prev) => ({
        ...prev,
        isSupported: true,
        devices: inputs,
        selectedDevice: inputs[0]?.id || null,
      }));

      (access as { onstatechange: () => void }).onstatechange = () => {
        const updatedInputs: Array<{ id: string; name: string; manufacturer: string; onmidimessage: unknown }> = [];
        (access as { inputs: { forEach: (callback: (input: { id: string; name: string; manufacturer: string; onmidimessage: unknown }) => void) => void } }).inputs.forEach((input) => {
          updatedInputs.push(input);
          (input as { onmidimessage: unknown }).onmidimessage = handleMIDIMessage;
        });
        setState((prev) => ({
          ...prev,
          devices: updatedInputs,
        }));
      };
    } catch (error) {
      console.warn("MIDI access failed:", error);
    }
  }, [handleMIDIMessage]);

  const selectDevice = useCallback((deviceId: string) => {
    setState((prev) => ({ ...prev, selectedDevice: deviceId }));
  }, []);

  useEffect(() => {
    initMIDI();

    return () => {
      const access = accessRef.current as { inputs?: { forEach: (callback: (input: { onmidimessage: unknown }) => void) => void } } | null;
      access?.inputs?.forEach((input: { onmidimessage: unknown }) => {
        input.onmidimessage = null;
      });
    };
  }, [initMIDI]);

  return {
    ...state,
    initMIDI,
    selectDevice,
  };
}
