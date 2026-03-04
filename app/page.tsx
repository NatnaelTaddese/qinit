"use client";

import { useState, useCallback, useMemo } from "react";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { ScaleExplorer } from "@/components/scale-explorer";
import { ScaleNavbar, TabType } from "@/components/scale-navbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ScaleType,
  ScaleVariant,
  RootNote,
  ScaleCategory,
  getScaleType,
  hasVariants,
} from "@/lib/scales";
import { useAudio } from "@/hooks/use-audio";

// MIDI note to frequency conversion
function midiNoteToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export default function Home() {
  const [isKeyboardCollapsed, setIsKeyboardCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("tizita");
  const [variant, setVariant] = useState<ScaleVariant>("major");
  const [selectedRoot, setSelectedRoot] = useState<RootNote>("C#");
  const [playbackNotes, setPlaybackNotes] = useState<Set<number>>(new Set());

  const { initAudio, playNote, stopNote } = useAudio();

  // Compute selectedScale from activeTab and variant
  const selectedScale: ScaleType | null = useMemo(() => {
    if (activeTab === "kinit" || activeTab === "quiz") return null;
    return getScaleType(
      activeTab as ScaleCategory,
      hasVariants(activeTab as ScaleCategory) ? variant : null,
    );
  }, [activeTab, variant]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const handleVariantChange = useCallback((newVariant: ScaleVariant) => {
    setVariant(newVariant);
  }, []);

  const handleRootChange = useCallback((root: RootNote) => {
    setSelectedRoot(root);
  }, []);

  const handlePlayNote = useCallback(
    (midi: number) => {
      initAudio();
      playNote(midiNoteToFrequency(midi), midi);
      setPlaybackNotes((prev) => new Set([...prev, midi]));
    },
    [initAudio, playNote],
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
    [stopNote],
  );

  // Calculate heights
  const showVariantToggle =
    activeTab !== "kinit" &&
    activeTab !== "quiz" &&
    hasVariants(activeTab as ScaleCategory);
  const navbarHeight = showVariantToggle ? 120 : 72;
  const keyboardHeight = isKeyboardCollapsed ? 48 : 280;

  return (
    <div className="h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Fixed Navbar */}
      <ScaleNavbar
        activeTab={activeTab}
        variant={variant}
        onTabChange={handleTabChange}
        onVariantChange={handleVariantChange}
      />

      {/* Scrollable Content Area */}
      <ScrollArea
        style={{
          position: "fixed",
          top: navbarHeight,
          left: 0,
          right: 0,
          bottom: keyboardHeight,
        }}
      >
        <main className="flex min-h-full flex-col items-center justify-start p-8">
          <ScaleExplorer
            activeTab={activeTab}
            variant={variant}
            selectedRoot={selectedRoot}
            onRootChange={handleRootChange}
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
