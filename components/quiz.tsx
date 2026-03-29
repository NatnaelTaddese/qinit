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

        {/* Drop Zone */}
        {detectorState === "idle" || detectorState === "error" ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center gap-3",
              "min-h-[180px] rounded-[3px] cursor-pointer transition-all duration-200",
              "border-2 border-dashed",
            )}
            style={{
              borderColor: isDragOver ? ACCENT : `${ACCENT}40`,
              background: isDragOver
                ? `${ACCENT}10`
                : "linear-gradient(145deg, rgba(6,182,212,0.03), rgba(6,182,212,0.06))",
              boxShadow: isDragOver ? `0 0 24px ${ACCENT}20` : "none",
            }}
          >
            {/* Waveform icon */}
            <svg
              width="48"
              height="32"
              viewBox="0 0 48 32"
              fill="none"
              style={{ opacity: isDragOver ? 1 : 0.4 }}
            >
              <rect x="0" y="13" width="3" height="6" rx="1.5" fill={ACCENT} />
              <rect x="5" y="9" width="3" height="14" rx="1.5" fill={ACCENT} />
              <rect x="10" y="4" width="3" height="24" rx="1.5" fill={ACCENT} />
              <rect x="15" y="8" width="3" height="16" rx="1.5" fill={ACCENT} />
              <rect x="20" y="0" width="3" height="32" rx="1.5" fill={ACCENT} />
              <rect x="25" y="6" width="3" height="20" rx="1.5" fill={ACCENT} />
              <rect x="30" y="10" width="3" height="12" rx="1.5" fill={ACCENT} />
              <rect x="35" y="7" width="3" height="18" rx="1.5" fill={ACCENT} />
              <rect x="40" y="12" width="3" height="8" rx="1.5" fill={ACCENT} />
              <rect x="45" y="14" width="3" height="4" rx="1.5" fill={ACCENT} />
            </svg>

            <div className="text-center">
              <div
                className="text-sm font-mono font-bold mb-1"
                style={{ color: isDragOver ? ACCENT : `${ACCENT}80` }}
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
                className="text-xs font-mono px-3 py-1.5 rounded-[2px]"
                style={{
                  color: "#ef4444",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
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

        {/* Loading */}
        {detectorState === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-[180px] gap-4">
            <div className="relative w-12 h-12">
              <div
                className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${ACCENT}40`, borderTopColor: ACCENT }}
              />
            </div>
            <div className="text-center">
              <div className="text-sm font-mono" style={{ color: ACCENT }}>
                Analyzing pitch content…
              </div>
              <div
                className="text-[11px] font-mono opacity-50 mt-1 max-w-[220px] truncate"
                style={{ color: ACCENT }}
              >
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

            {/* Table header */}
            <div className="flex items-center mb-2 font-mono text-[9px] uppercase tracking-wider opacity-40" style={{ color: ACCENT }}>
              <span className="w-4 mr-2" />
              <span className="w-2 mr-2" />
              <span className="flex-1">Scale</span>
              <span className="w-24 text-right">Notes in scale</span>
              <span className="w-20 text-right">Confidence</span>
            </div>

            <div className="space-y-2">
              {topResults.map((r, idx) => {
                const info = SCALE_INFO[r.scaleType];
                const coveragePct = Math.round(r.coverage * 100);
                const scorePct = Math.round(r.score * 100);
                const isTop = idx === 0;

                return (
                  <div
                    key={`${r.scaleType}-${r.root}`}
                    className="space-y-1.5 rounded-[3px] px-2 py-1.5"
                    style={{
                      background: `${info.color}${isTop ? "14" : "08"}`,
                      border: `1px solid ${info.color}${isTop ? "30" : "15"}`,
                      boxShadow: isTop ? `0 0 12px ${info.color}10` : "none",
                    }}
                  >
                    {/* Label row */}
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-center gap-2">
                        {/* Rank */}
                        <span
                          className="text-[10px] font-mono w-4 text-right opacity-40"
                          style={{ color: info.color }}
                        >
                          {idx + 1}
                        </span>
                        {/* Name */}
                        <span
                          className={cn(
                            "font-mono text-sm",
                            isTop ? "font-bold" : "font-medium opacity-80",
                          )}
                          style={{
                            color: info.color,
                            textShadow: isTop ? `0 0 10px ${info.color}80` : "none",
                          }}
                        >
                          {r.root} {info.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-0 font-mono text-xs">
                        <span
                          className="w-24 text-right opacity-40"
                          style={{ color: info.color }}
                        >
                          {coveragePct}%
                        </span>
                        <span
                          className={cn("w-20 text-right font-bold", isTop && "text-sm")}
                          style={{
                            color: info.color,
                            textShadow: isTop ? `0 0 8px ${info.color}` : "none",
                          }}
                        >
                          {scorePct}%
                        </span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div
                      className="relative h-[4px] rounded-full"
                      style={{ background: `${info.color}18` }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{
                          width: `${r.relative}%`,
                          background: isTop
                            ? `linear-gradient(90deg, ${info.color}80, ${info.color})`
                            : `${info.color}60`,
                          boxShadow: isTop ? `0 0 6px ${info.color}60` : "none",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chromagram strip */}
            <ChromagramStrip results={results.slice(0, 1)[0]} />

            {/* Reset button */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 rounded-[3px] font-mono text-xs transition-all hover:translate-y-[1px] active:translate-y-[2px]"
                style={{
                  background: `${ACCENT}20`,
                  border: `1px solid ${ACCENT}40`,
                  color: ACCENT,
                }}
              >
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
    <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${ACCENT}15` }}>
      <div
        className="text-[10px] uppercase tracking-wider mb-2 opacity-40 font-mono"
        style={{ color: ACCENT }}
      >
        Top match notes · {results.root} {info.name}
      </div>
      <div className="flex gap-1">
        {NOTE_NAMES.map((name, pc) => {
          const inScale = scalePCs.has(pc);
          const isRoot = name === results.root;
          return (
            <div
              key={pc}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className="w-full h-[28px] rounded-[2px] flex items-center justify-center"
                style={{
                  background: inScale
                    ? isRoot
                      ? info.color
                      : `${info.color}50`
                    : `${ACCENT}08`,
                  border: `1px solid ${inScale ? info.color : `${ACCENT}20`}`,
                  boxShadow: isRoot ? `0 0 8px ${info.color}80` : "none",
                }}
              >
                <span
                  className="text-[9px] font-mono font-bold leading-none"
                  style={{
                    color: inScale ? (isRoot ? "#fff" : info.color) : `${ACCENT}30`,
                    textShadow: isRoot ? `0 0 6px ${info.color}` : "none",
                  }}
                >
                  {name.replace("#", "♯")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
