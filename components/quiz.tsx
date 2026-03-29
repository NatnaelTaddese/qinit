"use client";

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import {
  ScaleType,
  RootNote,
  ROOT_NOTES,
  SCALE_INFO,
  getScaleNotes,
} from "@/lib/scales";

// Pitch class (0–11) for each note name
const NOTE_TO_PC: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

const ALL_SCALE_TYPES: ScaleType[] = [
  "tizita-major", "tizita-minor",
  "bati-major", "bati-minor",
  "ambassel-major", "ambassel-minor",
  "anchihoye",
];

interface DetectionResult {
  scaleType: ScaleType;
  root: RootNote;
  coverage: number;    // raw in-scale energy fraction (0–1), for display
  score: number;       // penalized score: 0 = flat chroma, 1 = perfect match
  relative: number;    // score relative to top result (0–100)
}

type DetectorState = "idle" | "loading" | "results" | "error";

// ─── LCD Screen ─────────────────────────────────────────────────────────────
function LCDScreen({
  children,
  className,
  accentColor = "#06b6d4",
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[4px]",
        "bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950",
        "p-[3px]",
        "shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        className,
      )}
    >
      <div className="rounded-[2px] bg-gradient-to-b from-zinc-950 to-zinc-900 p-[2px]">
        <div
          className="relative rounded-[1px] p-4"
          style={{
            background: `linear-gradient(145deg, ${accentColor}08, ${accentColor}15, ${accentColor}05)`,
            boxShadow: `inset 0 0 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.5)`,
          }}
        >
          {/* scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-[1px]"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)`,
            }}
          />
          {/* screen glare */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[1px]"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
            }}
          />
          <div className="relative z-10">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── FFT (Cooley–Tukey radix-2 DIT, in-place) ───────────────────────────────
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // bit-reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  // butterfly stages
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    const dwr = Math.cos(ang);
    const dwi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1, wi = 0;
      for (let j = 0; j < half; j++) {
        const ur = re[i + j], ui = im[i + j];
        const vr = re[i + j + half] * wr - im[i + j + half] * wi;
        const vi = re[i + j + half] * wi + im[i + j + half] * wr;
        re[i + j] = ur + vr;
        im[i + j] = ui + vi;
        re[i + j + half] = ur - vr;
        im[i + j + half] = ui - vi;
        const nwr = wr * dwr - wi * dwi;
        wi = wr * dwi + wi * dwr;
        wr = nwr;
      }
    }
  }
}

// ─── Chromagram builder (energy-weighted) ───────────────────────────────────
//
// Each frame's spectral magnitudes are multiplied by the frame's RMS energy
// before accumulation, so loud (musically prominent) frames dominate the
// chromagram while near-silent frames are skipped entirely.
//
function buildChromagram(audioBuffer: AudioBuffer): Float64Array {
  const FFT_SIZE = 4096;
  const sr = audioBuffer.sampleRate;
  const chroma = new Float64Array(12);

  // Mix to mono
  const numCh = audioBuffer.numberOfChannels;
  const len = audioBuffer.length;
  const mono = new Float32Array(len);
  for (let c = 0; c < numCh; c++) {
    const ch = audioBuffer.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += ch[i] / numCh;
  }

  // Hann window
  const hann = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++)
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));

  // Sample frames uniformly, skip first/last 5% (common silence regions)
  const start = Math.floor(len * 0.05);
  const end = Math.floor(len * 0.95);
  const available = end - start - FFT_SIZE;
  const FRAMES = Math.max(1, Math.min(200, Math.floor(available / (FFT_SIZE / 4))));
  const step = Math.max(1, Math.floor(available / FRAMES));

  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);

  const minBin = Math.max(1, Math.floor((55 * FFT_SIZE) / sr));  // ~A1 (55 Hz)
  const maxBin = Math.ceil((4200 * FFT_SIZE) / sr);              // ~C8

  // Silence gate: skip frames whose RMS is below 0.5% of full scale
  const SILENCE_THRESHOLD = 0.005;

  for (let fi = 0; fi < FRAMES; fi++) {
    const offset = start + fi * step;
    if (offset + FFT_SIZE > len) break;

    // Apply Hann window and compute frame RMS simultaneously
    let sumSq = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = mono[offset + i] * hann[i];
      sumSq += re[i] * re[i];
      im[i] = 0;
    }
    const rms = Math.sqrt(sumSq / FFT_SIZE);
    if (rms < SILENCE_THRESHOLD) continue; // skip silent / near-silent frames

    fft(re, im);

    // Accumulate energy-weighted spectral magnitude into chroma bins.
    // Multiplying by rms means louder frames contribute proportionally more.
    for (let b = minBin; b < Math.min(maxBin, FFT_SIZE / 2); b++) {
      const freq = (b * sr) / FFT_SIZE;
      const midi = 69 + 12 * Math.log2(freq / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      const mag = Math.sqrt(re[b] * re[b] + im[b] * im[b]);
      chroma[pc] += mag * rms;
    }
  }

  // L1-normalize so chroma sums to 1
  let total = 0;
  for (let i = 0; i < 12; i++) total += chroma[i];
  if (total > 0)
    for (let i = 0; i < 12; i++) chroma[i] /= total;

  return chroma;
}

// ─── Score all 84 scale variants ────────────────────────────────────────────
//
// Penalized scoring:
//   score = in_energy − (NUM_IN / NUM_OUT) × out_energy
//         = in_energy − (5/7) × (1 − in_energy)
//
// Derivation: a perfectly flat (uniform) chromagram has in_energy = 5/12.
// Setting the flat-chroma score to 0 and solving gives the 5/7 coefficient.
// Perfect match (in_energy = 1) → score = 1.
// Worse than random → score < 0 (clamped to 0 for display).
//
const PENALTY = 5 / 7; // NUM_IN / NUM_OUT for 5-note scales

function detectScales(chroma: Float64Array): DetectionResult[] {
  const results: DetectionResult[] = [];

  for (const scaleType of ALL_SCALE_TYPES) {
    for (const root of ROOT_NOTES) {
      const notes = getScaleNotes(scaleType, root);
      let coverage = 0;
      for (const note of notes) {
        const pc = NOTE_TO_PC[note];
        if (pc !== undefined) coverage += chroma[pc];
      }
      const outEnergy = 1 - coverage;
      const score = Math.max(0, coverage - PENALTY * outEnergy);
      results.push({ scaleType, root, coverage, score, relative: 0 });
    }
  }

  results.sort((a, b) => b.score - a.score);

  const maxScore = results[0]?.score ?? 1;
  for (const r of results)
    r.relative = maxScore > 0 ? Math.round((r.score / maxScore) * 100) : 0;

  return results;
}

// ─── Main component ──────────────────────────────────────────────────────────
const ACCENT = "#06b6d4"; // cyan

export function Quiz() {
  const [detectorState, setDetectorState] = useState<DetectorState>("idle");
  const [results, setResults] = useState<DetectionResult[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a|aiff?)$/i)) {
      setErrorMsg("Please drop an audio file (MP3, WAV, FLAC, OGG, etc.)");
      setDetectorState("error");
      return;
    }

    setFileName(file.name);
    setDetectorState("loading");
    setErrorMsg("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      await audioCtx.close();

      const chroma = buildChromagram(audioBuffer);
      const detected = detectScales(chroma);
      setResults(detected);
      setDetectorState("results");
    } catch {
      setErrorMsg("Could not decode audio. Try a different file.");
      setDetectorState("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) analyzeFile(file);
    },
    [analyzeFile],
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) analyzeFile(file);
      e.target.value = "";
    },
    [analyzeFile],
  );

  const reset = useCallback(() => {
    setDetectorState("idle");
    setResults([]);
    setFileName("");
    setErrorMsg("");
  }, []);

  // Top results: first 5 distinct scale types, then fill to 10
  const topResults = results.slice(0, 10);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <LCDScreen accentColor={ACCENT}>
        {/* Header */}
        <div className="text-center mb-4">
          <div
            className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-60 font-mono"
            style={{ color: ACCENT }}
          >
            Audio Analysis
          </div>
          <h2 className="text-2xl font-bold tracking-wide" style={{ color: ACCENT }}>
            Scale Detector
          </h2>
          <p className="text-xs opacity-50 mt-1 font-mono" style={{ color: ACCENT }}>
            Drop Ethiopian music to identify its key & scale
          </p>
        </div>

        {/* Drop Zone - hardware input style */}
        {detectorState === "idle" || detectorState === "error" ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center gap-3",
              "min-h-[180px] rounded-md cursor-pointer transition-all duration-200",
              "border-2 border-dashed",
            )}
            style={{
              borderColor: isDragOver ? ACCENT : `${ACCENT}30`,
              background: isDragOver
                ? `${ACCENT}08`
                : "linear-gradient(145deg, rgba(6,182,212,0.02), rgba(6,182,212,0.04))",
              boxShadow: isDragOver
                ? `0 0 30px ${ACCENT}25, inset 0 0 30px ${ACCENT}08`
                : "inset 0 0 40px rgba(0,0,0,0.2)",
            }}
          >
            {/* Hardware bezel effect */}
            <div className="absolute inset-0 rounded-md pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${ACCENT}15` }} />

            {/* LED indicator */}
            <div
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                isDragOver && "animate-pulse"
              )}
              style={{
                background: isDragOver
                  ? `radial-gradient(circle at 30% 30%, ${ACCENT}, ${ACCENT}80)`
                  : "radial-gradient(circle at 30% 30%, #444, #222)",
                boxShadow: isDragOver
                  ? `0 0 12px ${ACCENT}, 0 0 20px ${ACCENT}80`
                  : "inset 0 1px 2px rgba(0,0,0,0.5)",
              }}
            />

            {/* Waveform icon - retro LCD style */}
            <svg
              width="48"
              height="32"
              viewBox="0 0 48 32"
              fill="none"
              style={{ opacity: isDragOver ? 1 : 0.5 }}
            >
              <rect x="0" y="13" width="3" height="6" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
              <rect x="5" y="9" width="3" height="14" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
              <rect x="10" y="4" width="3" height="24" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
              <rect x="15" y="8" width="3" height="16" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
              <rect x="20" y="0" width="3" height="32" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
              <rect x="25" y="6" width="3" height="20" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
              <rect x="30" y="10" width="3" height="12" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
              <rect x="35" y="7" width="3" height="18" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
              <rect x="40" y="12" width="3" height="8" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
              <rect x="45" y="14" width="3" height="4" rx="1" fill={ACCENT} style={{ filter: isDragOver ? `drop-shadow(0 0 4px ${ACCENT})` : 'none' }} />
            </svg>

            <div className="text-center">
              <div
                className="text-sm font-mono font-bold mb-1"
                style={{
                  color: isDragOver ? ACCENT : `${ACCENT}80`,
                  textShadow: isDragOver ? `0 0 10px ${ACCENT}80` : 'none',
                }}
              >
                {isDragOver ? "Drop to analyze" : "Drop audio file here"}
              </div>
              <div
                className="text-[11px] font-mono opacity-50"
                style={{ color: ACCENT }}
              >
                or click to browse · MP3, WAV, FLAC, OGG, AIFF
              </div>
            </div>

            {detectorState === "error" && (
              <div
                className="text-xs font-mono px-3 py-1.5 rounded-[2px] flex items-center gap-2"
                style={{
                  color: "#ef4444",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  textShadow: "0 0 8px rgba(239,68,68,0.5)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: '0 0 6px #ef4444' }} />
                {errorMsg}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.ogg,.aac,.m4a,.aif,.aiff"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        ) : null}

        {/* Loading - retro CRT scanning style */}
        {detectorState === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-[180px] gap-4">
            {/* Retro LED array loading indicator */}
            <div className="relative">
              {/* Outer bezel */}
              <div className="rounded-md p-1 bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.5)]">
                {/* Inner display */}
                <div className="relative w-16 h-16 rounded-sm overflow-hidden" style={{ backgroundColor: `${ACCENT}08`, boxShadow: `inset 0 0 20px rgba(0,0,0,0.5)` }}>
                  {/* Scanning line effect */}
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent" />
                  {/* LED dots */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1">
                    {[0, 1, 2].map((col) => (
                      <div key={col} className="flex flex-col gap-1">
                        {[0, 1, 2].map((row) => {
                          const delay = (col * 3 + row) * 100;
                          return (
                            <div
                              key={row}
                              className="w-2 h-2 rounded-full animate-pulse"
                              style={{
                                background: `radial-gradient(circle at 30% 30%, ${ACCENT}, ${ACCENT}60)`,
                                boxShadow: `0 0 4px ${ACCENT}`,
                                animationDelay: `${delay}ms`,
                                opacity: 0.3 + Math.random() * 0.7,
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              {/* Retro text with glow */}
              <div className="text-sm font-mono" style={{ color: ACCENT, textShadow: `0 0 10px ${ACCENT}80, 0 0 20px ${ACCENT}40` }}>
                Analyzing pitch content
              </div>
              {/* Blinking cursor */}
              <span className="inline-block w-2 h-3 ml-0.5 animate-pulse" style={{ background: ACCENT }} />
              <div className="text-[11px] font-mono mt-1 max-w-[220px] truncate" style={{ color: ACCENT, opacity: 0.5 }}>
                {fileName}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {detectorState === "results" && topResults.length > 0 && (
          <div>
            <div
              className="text-[10px] uppercase tracking-wider mb-3 opacity-50 font-mono"
              style={{ color: ACCENT }}
            >
              Top matches · {fileName && <span className="normal-case opacity-70">{fileName}</span>}
            </div>

            {/* Results display - hardware LED meter style */}
            <div className="space-y-2">
              {topResults.map((r, idx) => {
                const info = SCALE_INFO[r.scaleType];
                const coveragePct = Math.round(r.coverage * 100);
                const scorePct = Math.round(r.score * 100);
                const isTop3 = idx < 3;
                const isFirst = idx === 0;

                return (
                  <div
                    key={`${r.scaleType}-${r.root}`}
                    className={cn(
                      "relative rounded-md p-2 overflow-hidden transition-all duration-300 border",
                      isTop3 ? "opacity-100" : "opacity-50",
                      isFirst ? "shadow-[0_0_25px_var(--tw-shadow-color)]" : isTop3 ? "shadow-[0_0_15px_var(--tw-shadow-color)]" : "shadow-none",
                    )}
                    style={{
                      backgroundColor: isTop3 ? `${info.color}10` : `${info.color}04`,
                      borderColor: isTop3 ? `${info.color}` : `${info.color}30`,
                      boxShadow: isFirst 
                        ? `0 0 25px ${info.color}20, inset 0 0 40px ${info.color}10`
                        : isTop3 
                          ? `0 0 15px ${info.color}10`
                          : 'none',
                      '--tw-shadow-color': info.color,
                    } as React.CSSProperties}
                  >
                    {/* CRT scanline effect on each row */}
                    <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJibGFjayIgb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPg==')]" />

                    <div className="relative z-10 flex items-center gap-2">
                      {/* Rank LED */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded-[2px] flex items-center justify-center font-mono text-[9px] font-bold transition-all",
                          isTop3 ? "text-white" : "text-zinc-500",
                        )}
                        style={{
                          background: isTop3
                            ? `linear-gradient(180deg, ${info.color}, ${info.color}cc)`
                            : "linear-gradient(180deg, #2a2a2a, #1a1a1a)",
                          border: `1px solid ${isTop3 ? info.color : "#333"}`,
                          boxShadow: isTop3
                            ? `inset 0 1px 0 ${info.color}cc, inset 0 -1px 2px rgba(0,0,0,0.4), 0 0 10px ${info.color}80`
                            : `inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 2px rgba(0,0,0,0.4)`,
                          color: isTop3 ? "#fff" : `${info.color}40`,
                          textShadow: isTop3 ? `0 0 8px ${info.color}` : "none",
                        }}
                      >
                        {idx + 1}
                      </div>

                      {/* Scale name */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "font-mono text-sm truncate",
                            isTop3 ? "font-bold" : "font-medium opacity-80",
                          )}
                          style={{
                            color: info.color,
                            textShadow: isTop3 ? `0 0 12px ${info.color}80` : "none",
                          }}
                        >
                          {r.root} {info.name}
                        </div>
                      </div>

                      {/* LED meter display */}
                      <div className="flex items-center gap-1">
                        {/* Coverage */}
                        <div className="flex flex-col items-end">
                          <span
                            className="text-[8px] font-mono uppercase"
                            style={{ color: info.color, opacity: 0.4 }}
                          >
                            IN
                          </span>
                          <span
                            className="font-mono text-[10px]"
                            style={{ color: info.color }}
                          >
                            {coveragePct}%
                          </span>
                        </div>

                        {/* Score */}
                        <div
                          className={cn(
                            "ml-2 px-2 py-0.5 rounded-[2px] font-mono text-sm font-bold min-w-[45px] text-center transition-all",
                          )}
                          style={{
                            background: isTop3
                              ? `linear-gradient(180deg, ${info.color}30, ${info.color}15)`
                              : `${info.color}10`,
                            border: `1px solid ${info.color}${isTop3 ? "60" : "30"}`,
                            color: info.color,
                            textShadow: isTop3 ? `0 0 8px ${info.color}` : "none",
                            boxShadow: isTop3 ? `inset 0 0 10px ${info.color}20` : "none",
                          }}
                        >
                          {scorePct}%
                        </div>
                      </div>
                    </div>

                    {/* LED bar - segmented retro style */}
                    <div className="relative z-10 mt-1.5 flex gap-[2px]">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const threshold = (i + 1) * 5;
                        const active = r.relative >= threshold;
                        const segmentIndex = i;
                        const totalSegments = 20;
                        const isHigh = segmentIndex >= totalSegments * 0.6;
                        const isMid = segmentIndex >= totalSegments * 0.3;

                        let segmentColor = `${info.color}20`;
                        if (active) {
                          if (isTop3) {
                            segmentColor = isHigh ? info.color : isMid ? `${info.color}cc` : `${info.color}99`;
                          } else {
                            segmentColor = isHigh ? `${info.color}aa` : isMid ? `${info.color}77` : `${info.color}55`;
                          }
                        }

                        return (
                          <div
                            key={i}
                            className="h-2 flex-1 rounded-sm transition-all duration-300"
                            style={{
                              background: segmentColor,
                              boxShadow: active && isTop3
                                ? `0 0 4px ${info.color}60`
                                : "none",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chromagram strip */}
            <ChromagramStrip results={results.slice(0, 1)[0]} />

            {/* Reset button - MPC pad style */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={reset}
                className="relative px-5 py-2.5 rounded-[3px] font-mono text-xs font-medium transition-all hover:translate-y-[1px] active:translate-y-[2px]"
                style={{
                  background: `linear-gradient(180deg, ${ACCENT}40, ${ACCENT}25)`,
                  border: `1px solid ${ACCENT}60`,
                  boxShadow: `
                    inset 0 1px 0 ${ACCENT}66,
                    inset 0 -1px 2px rgba(0,0,0,0.3),
                    0 2px 4px rgba(0,0,0,0.4),
                    0 4px 8px rgba(0,0,0,0.2)
                  `,
                  color: ACCENT,
                  textShadow: `0 0 8px ${ACCENT}80`,
                }}
              >
                {/* LED indicator */}
                <div
                  className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${ACCENT}, ${ACCENT}aa)`,
                    boxShadow: `0 0 6px ${ACCENT}, 0 0 10px ${ACCENT}80`,
                  }}
                />
                Analyze another file
              </button>
            </div>
          </div>
        )}
      </LCDScreen>

      {/* Info card */}
      {detectorState === "idle" && (
        <LCDScreen accentColor={ACCENT}>
          <div className="text-[10px] uppercase tracking-wider mb-2 opacity-40 font-mono" style={{ color: ACCENT }}>
            How it works
          </div>
          <p className="text-xs leading-relaxed opacity-60 font-mono" style={{ color: ACCENT }}>
            Builds an <strong className="opacity-90">energy-weighted chromagram</strong> via FFT — each frame&apos;s
            spectral energy is weighted by its RMS, so loud frames dominate and silence is ignored.
            Each of the 84 variants (7 scales × 12 roots) is scored as{" "}
            <strong className="opacity-90">in_energy − (5/7) × out_energy</strong>, which penalises
            off-note energy and normalises so a flat spectrum scores 0 and a perfect match scores 100%.
          </p>
        </LCDScreen>
      )}
    </div>
  );
}

// ─── Chromagram strip visualizer ─────────────────────────────────────────────
function ChromagramStrip({ results }: { results: DetectionResult | undefined }) {
  if (!results) return null;
  const info = SCALE_INFO[results.scaleType];
  const scaleNotes = getScaleNotes(results.scaleType, results.root);
  const scalePCs = new Set(scaleNotes.map((n) => NOTE_TO_PC[n]));

  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  return (
    <div className="mt-4 pt-3 border-t" style={{ borderColor: `${ACCENT}15` }}>
      {/* Retro LCD display header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: ACCENT, opacity: 0.4 }}>
          Top match notes
        </div>
        <div className="text-[10px] font-mono font-bold" style={{ color: info.color, textShadow: `0 0 8px ${info.color}` }}>
          {results.root} {info.name}
        </div>
      </div>

      {/* Hardware LED display style */}
      <div className="rounded-md p-2 border" style={{ backgroundColor: `${ACCENT}05`, borderColor: `${ACCENT}15`, boxShadow: `inset 0 0 20px rgba(0,0,0,0.3)` }}>
        {/* CRT effect overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-md bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJibGFjayIgb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPg==')]" />

        <div className="flex gap-1 relative z-10">
          {NOTE_NAMES.map((name, pc) => {
            const inScale = scalePCs.has(pc);
            const isRoot = name === results.root;
            return (
              <div key={pc} className="flex-1 flex flex-col items-center gap-1">
                {/* LED segment display */}
                <div
                  className="w-full h-7 rounded-sm flex items-center justify-center"
                  style={{
                    background: inScale
                      ? isRoot
                        ? `linear-gradient(180deg, ${info.color}, ${info.color}cc)`
                        : `linear-gradient(180deg, ${info.color}60, ${info.color}40)`
                      : "linear-gradient(180deg, #1a1a1a, #0a0a0a)",
                    border: `1px solid ${inScale ? info.color : "#2a2a2a"}`,
                    boxShadow: isRoot
                      ? `inset 0 1px 0 ${info.color}cc, 0 0 12px ${info.color}80, inset 0 -2px 4px rgba(0,0,0,0.3)`
                      : inScale
                        ? `inset 0 1px 0 ${info.color}66, 0 0 6px ${info.color}40`
                        : `inset 0 1px 0 rgba(255,255,255,0.02), inset 0 -1px 2px rgba(0,0,0,0.3)`,
                  }}
                >
                  <span
                    className="text-[9px] font-mono font-bold leading-none"
                    style={{
                      color: inScale ? (isRoot ? "#fff" : info.color) : "#333",
                      textShadow: isRoot ? `0 0 8px ${info.color}, 0 0 12px ${info.color}` : "none",
                    }}
                  >
                    {name.replace("#", "♯")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scale note indicators below */}
        <div className="flex gap-1 mt-2">
          {NOTE_NAMES.map((name, pc) => {
            const inScale = scalePCs.has(pc);
            const isRoot = name === results.root;
            return (
              <div key={pc} className="flex-1 flex justify-center">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: inScale ? (isRoot ? info.color : `${info.color}80`) : "#222",
                    boxShadow: inScale ? `0 0 4px ${info.color}` : `inset 0 1px 2px rgba(0,0,0,0.5)`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
