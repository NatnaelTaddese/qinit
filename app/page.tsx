"use client";

import { useState, useCallback } from "react";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { ScaleExplorer } from "@/components/scale-explorer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScaleType, RootNote } from "@/lib/scales";
import { useAudio } from "@/hooks/use-audio";

// MIDI note to frequency conversion
function midiNoteToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export default function Home() {
  const [isKeyboardCollapsed, setIsKeyboardCollapsed] = useState(false);
  const [selectedScale, setSelectedScale] = useState<ScaleType | null>("tizita-major");
  const [selectedRoot, setSelectedRoot] = useState<RootNote>("C#");
  const [playbackNotes, setPlaybackNotes] = useState<Set<number>>(new Set());
  
  const { initAudio, playNote, stopNote } = useAudio();

  const handleScaleChange = useCallback(
    (scaleType: ScaleType | null, root: RootNote) => {
      setSelectedScale(scaleType);
      setSelectedRoot(root);
    },
    []
  );

  const handlePlayNote = useCallback(
    (midi: number) => {
      initAudio();
      playNote(midiNoteToFrequency(midi), midi);
      setPlaybackNotes((prev) => new Set([...prev, midi]));
    },
    [initAudio, playNote]
  );

  const handleStopNote = useCallback(
    (midi: number) => {
      stopNote(midi);
      setPlaybackNotes((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    },
    [stopNote]
  );

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-background via-background to-background/95">
      {/* Scrollable Content Area */}
      <ScrollArea
        className={
          isKeyboardCollapsed ? "h-[calc(100vh-48px)]" : "h-[calc(100vh-280px)]"
        }
      >
        <main className="flex min-h-full flex-col items-center justify-start p-8 pt-12">
          <ScaleExplorer
            onScaleChange={handleScaleChange}
            onPlayNote={handlePlayNote}
            onStopNote={handleStopNote}
          />
        </main>
      </ScrollArea>

      {/* Fixed Piano Keyboard Dock */}
      <PianoKeyboard
        selectedScale={selectedScale}
        selectedRoot={selectedRoot}
        playbackNotes={playbackNotes}
        onCollapseChange={setIsKeyboardCollapsed}
      />
    </div>
  );
}
