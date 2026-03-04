"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ScaleCategory,
  ScaleVariant,
  ScaleType,
  RootNote,
  SCALE_CATEGORIES,
  SCALE_INFO,
  NATURAL_NOTES,
  SHARP_NOTES,
  NOTES_WITH_SHARPS,
  getScaleType,
  hasVariants,
  getScaleNotesWithDegrees,
  getScaleMidiNotes,
} from "@/lib/scales";

interface ScaleExplorerProps {
  onScaleChange?: (scaleType: ScaleType | null, root: RootNote) => void;
  onPlayNote?: (midi: number) => void;
  onStopNote?: (midi: number) => void;
}

type TabType = "kinit" | ScaleCategory | "quiz";

export function ScaleExplorer({
  onScaleChange,
  onPlayNote,
  onStopNote,
}: ScaleExplorerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tizita");
  const [variant, setVariant] = useState<ScaleVariant>("major");
  const [selectedRoot, setSelectedRoot] = useState<RootNote>("C#");

  // Get current scale type based on tab and variant
  const currentScaleType: ScaleType | null =
    activeTab === "kinit" || activeTab === "quiz"
      ? null
      : getScaleType(activeTab, hasVariants(activeTab) ? variant : null);

  const scaleInfo = currentScaleType ? SCALE_INFO[currentScaleType] : null;
  const scaleNotes = currentScaleType
    ? getScaleNotesWithDegrees(currentScaleType, selectedRoot)
    : [];

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab !== "kinit" && tab !== "quiz") {
      const newScaleType = getScaleType(
        tab,
        hasVariants(tab) ? variant : null
      );
      onScaleChange?.(newScaleType, selectedRoot);
    } else {
      onScaleChange?.(null, selectedRoot);
    }
  };

  // Handle variant change
  const handleVariantChange = (newVariant: ScaleVariant) => {
    setVariant(newVariant);
    if (activeTab !== "kinit" && activeTab !== "quiz") {
      const newScaleType = getScaleType(activeTab, newVariant);
      onScaleChange?.(newScaleType, selectedRoot);
    }
  };

  // Handle root change
  const handleRootChange = (root: RootNote) => {
    setSelectedRoot(root);
    onScaleChange?.(currentScaleType, root);
  };

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
    [currentScaleType, selectedRoot, onPlayNote, onStopNote]
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-muted/30 p-1 backdrop-blur-sm border border-white/5">
          <TabButton
            active={activeTab === "kinit"}
            onClick={() => handleTabChange("kinit")}
          >
            Kiñit
          </TabButton>
          {SCALE_CATEGORIES.map((cat) => (
            <TabButton
              key={cat.id}
              active={activeTab === cat.id}
              onClick={() => handleTabChange(cat.id)}
              color={
                activeTab === cat.id
                  ? SCALE_INFO[
                      getScaleType(
                        cat.id,
                        hasVariants(cat.id) ? variant : null
                      )
                    ].color
                  : undefined
              }
            >
              {cat.label}
            </TabButton>
          ))}
          <TabButton
            active={activeTab === "quiz"}
            onClick={() => handleTabChange("quiz")}
          >
            Quiz
          </TabButton>
        </div>
      </div>

      {/* Major/Minor Toggle - only show for scales with variants */}
      {activeTab !== "kinit" &&
        activeTab !== "quiz" &&
        hasVariants(activeTab) && (
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg bg-muted/20 p-1 border border-white/5">
              <VariantButton
                active={variant === "major"}
                onClick={() => handleVariantChange("major")}
                color={scaleInfo?.color}
              >
                Major
              </VariantButton>
              <VariantButton
                active={variant === "minor"}
                onClick={() => handleVariantChange("minor")}
                color={scaleInfo?.color}
              >
                Minor
              </VariantButton>
            </div>
          </div>
        )}

      {/* Scale Info Card */}
      {scaleInfo && (
        <div
          className="relative rounded-xl p-6 backdrop-blur-sm border"
          style={{
            backgroundColor: `${scaleInfo.color}10`,
            borderColor: `${scaleInfo.color}30`,
          }}
        >
          {/* Scale Notes Badge */}
          <div
            className="absolute top-4 right-4 rounded-lg px-4 py-3 text-center"
            style={{
              backgroundColor: `${scaleInfo.color}20`,
              borderColor: `${scaleInfo.color}40`,
              border: "1px solid",
            }}
          >
            <div
              className="text-[10px] uppercase tracking-wider mb-1 opacity-70"
              style={{ color: scaleInfo.color }}
            >
              {selectedRoot} {scaleInfo.name.split(" ")[0]}{" "}
              {scaleInfo.variant || ""}
            </div>
            <div className="flex gap-2 text-sm font-medium">
              {scaleNotes.map(({ note }, i) => (
                <span
                  key={i}
                  className={cn(i === 0 && "font-bold")}
                  style={{ color: i === 0 ? scaleInfo.color : "inherit" }}
                >
                  {note}
                </span>
              ))}
              <span style={{ color: scaleInfo.color }}>{scaleNotes[0]?.note}</span>
            </div>
          </div>

          {/* Scale Title */}
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Ethiopian Pentatonic · {scaleInfo.variant || "Unique"} Variant
          </div>

          {/* Description */}
          <p className="text-foreground text-lg leading-relaxed max-w-xl mb-4">
            {scaleInfo.description}
          </p>

          {/* Cultural Context */}
          <p className="text-muted-foreground leading-relaxed max-w-xl mb-4">
            {scaleInfo.culturalContext}
          </p>

          {/* Notable Artists */}
          <div className="text-sm text-muted-foreground mb-3">
            <span className="font-medium">Notable artists:</span>{" "}
            {scaleInfo.notableArtists.join(" · ")}
          </div>

          {/* Formula */}
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Formula:</span>{" "}
            <span className="text-foreground font-mono">
              {scaleInfo.intervals}
            </span>
          </div>
        </div>
      )}

      {/* Kiñit Overview */}
      {activeTab === "kinit" && (
        <div className="rounded-xl p-6 backdrop-blur-sm border border-white/10 bg-muted/10">
          <h2 className="text-2xl font-bold mb-4">Ethiopian Kiñit Scales</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Kiñit (ቅኝት) refers to the system of modes or scales in Ethiopian
            music. Unlike Western music's major/minor dichotomy, Ethiopian music
            uses a rich palette of pentatonic scales, each with its own
            emotional character and cultural significance.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Select a scale above to explore its unique intervals, cultural
            context, and notable artists who have mastered its expression.
          </p>
        </div>
      )}

      {/* Quiz placeholder */}
      {activeTab === "quiz" && (
        <div className="rounded-xl p-6 backdrop-blur-sm border border-white/10 bg-muted/10 text-center">
          <h2 className="text-2xl font-bold mb-4">Scale Quiz</h2>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      )}

      {/* Root Note Selector */}
      {activeTab !== "kinit" && activeTab !== "quiz" && (
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Select Root
          </div>

          {/* Natural Notes Row */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-14">
              Natural
            </span>
            <div className="flex gap-1.5">
              {NATURAL_NOTES.map((note) => (
                <RootNoteButton
                  key={note}
                  note={note}
                  selected={selectedRoot === note}
                  onClick={() => handleRootChange(note)}
                  color={scaleInfo?.color}
                  partial={false}
                />
              ))}
            </div>
          </div>

          {/* Sharp Notes Row */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-14">
              Sharp
            </span>
            <div className="flex gap-1.5">
              {NATURAL_NOTES.map((note) => {
                const hasSharp = NOTES_WITH_SHARPS.includes(note);
                const sharpNote = `${note}#` as RootNote;
                if (!hasSharp) {
                  return <div key={note} className="w-11 h-10" />;
                }
                return (
                  <RootNoteButton
                    key={sharpNote}
                    note={sharpNote}
                    selected={selectedRoot === sharpNote}
                    onClick={() => handleRootChange(sharpNote)}
                    color={scaleInfo?.color}
                    partial={false}
                  />
                );
              })}
              <span className="text-[10px] text-muted-foreground ml-2">
                * partial
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scale Degrees Display */}
      {scaleInfo && scaleNotes.length > 0 && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg"
          style={{ backgroundColor: `${scaleInfo.color}10` }}
        >
          <span
            className="text-xs font-medium mr-2"
            style={{ color: scaleInfo.color }}
          >
            {selectedRoot} {scaleInfo.name.split(" ")[0].toUpperCase()}
          </span>
          <div className="flex gap-1">
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
                    4
                  );
                  onPlayNote?.(midiNotes[i]);
                }}
                onMouseUp={() => {
                  const midiNotes = getScaleMidiNotes(
                    currentScaleType!,
                    selectedRoot,
                    4
                  );
                  onStopNote?.(midiNotes[i]);
                }}
              />
            ))}
            {/* Octave */}
            <ScaleDegreeButton
              note={scaleNotes[0].note}
              label="OCTAVE"
              color={scaleInfo.color}
              isRoot={false}
              onMouseDown={() => {
                const midiNotes = getScaleMidiNotes(
                  currentScaleType!,
                  selectedRoot,
                  4
                );
                onPlayNote?.(midiNotes[0] + 12);
              }}
              onMouseUp={() => {
                const midiNotes = getScaleMidiNotes(
                  currentScaleType!,
                  selectedRoot,
                  4
                );
                onStopNote?.(midiNotes[0] + 12);
              }}
            />
          </div>

          {/* Playback Controls */}
          <div className="flex gap-1 ml-auto">
            <PlaybackButton
              icon="↑"
              title="Play ascending"
              onClick={() => playScale("ascending")}
            />
            <PlaybackButton
              icon="↓"
              title="Play descending"
              onClick={() => playScale("descending")}
            />
            <PlaybackButton icon="?" title="Quiz" onClick={() => {}} />
            <PlaybackButton
              icon="▶"
              title="Play"
              onClick={() => playScale("ascending")}
              primary
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium rounded-md transition-all",
        active
          ? "text-white shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}
      style={
        active
          ? {
              backgroundColor: color || "hsl(var(--primary))",
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

// Variant Button Component
function VariantButton({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-5 py-2 text-sm font-medium rounded-md transition-all min-w-[100px]",
        active
          ? "text-white shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}
      style={
        active
          ? {
              backgroundColor: color || "hsl(var(--primary))",
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

// Root Note Button Component
function RootNoteButton({
  note,
  selected,
  onClick,
  color,
  partial,
}: {
  note: RootNote;
  selected: boolean;
  onClick: () => void;
  color?: string;
  partial: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-11 h-10 rounded-md text-sm font-medium transition-all border",
        selected
          ? "text-white border-transparent"
          : "text-muted-foreground border-white/10 hover:border-white/20 hover:bg-white/5",
        partial && "opacity-50"
      )}
      style={
        selected
          ? {
              backgroundColor: color || "hsl(var(--primary))",
            }
          : undefined
      }
    >
      {note}
    </button>
  );
}

// Scale Degree Button Component
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
        "flex flex-col items-center justify-center px-3 py-1.5 rounded-md transition-all",
        "hover:bg-white/10 active:scale-95"
      )}
      style={{
        backgroundColor: isRoot ? `${color}40` : `${color}20`,
        color: isRoot ? color : "inherit",
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <span className={cn("text-sm font-medium", isRoot && "font-bold")}>
        {note}
      </span>
      <span className="text-[8px] uppercase tracking-wider opacity-70">
        {label}
      </span>
    </button>
  );
}

// Playback Button Component
function PlaybackButton({
  icon,
  title,
  onClick,
  primary,
}: {
  icon: string;
  title: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-9 h-9 rounded-md flex items-center justify-center transition-all",
        primary
          ? "bg-white/20 hover:bg-white/30 text-white"
          : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
    </button>
  );
}
