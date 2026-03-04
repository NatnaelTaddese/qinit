// Ethiopian Kiñit Scales

export type ScaleCategory = "tizita" | "bati" | "ambassel" | "anchihoye";
export type ScaleVariant = "major" | "minor";

export type ScaleType =
  | "tizita-major"
  | "tizita-minor"
  | "bati-major"
  | "bati-minor"
  | "ambassel-major"
  | "ambassel-minor"
  | "anchihoye";

export type RootNote =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";

export interface ScaleDegree {
  interval: string;
  label: string;
  semitones: number;
}

export interface ScaleInfo {
  name: string;
  category: ScaleCategory;
  variant: ScaleVariant | null; // null for Anchihoye (no major/minor)
  color: string;
  intervals: string;
  degrees: ScaleDegree[];
  description: string;
  culturalContext: string;
  notableArtists: string[];
}

export const SCALE_CATEGORIES: { id: ScaleCategory; label: string }[] = [
  { id: "tizita", label: "Tizita" },
  { id: "bati", label: "Bati" },
  { id: "ambassel", label: "Ambassel" },
  { id: "anchihoye", label: "Anchihoye" },
];

export const SCALE_INFO: Record<ScaleType, ScaleInfo> = {
  "tizita-major": {
    name: "Tizita Major",
    category: "tizita",
    variant: "major",
    color: "#ef4444", // red
    intervals: "Root — Maj 2nd — Maj 3rd — Perf 5th — Maj 6th",
    degrees: [
      { interval: "Root", label: "ROOT", semitones: 0 },
      { interval: "Maj 2nd", label: "MAJ 2ND", semitones: 2 },
      { interval: "Maj 3rd", label: "MAJ 3RD", semitones: 4 },
      { interval: "Perf 5th", label: "PERF 5TH", semitones: 7 },
      { interval: "Maj 6th", label: "MAJ 6TH", semitones: 9 },
    ],
    description:
      "Tizita Major evokes nostalgic brightness — the sound of joyful memory. Its raised 3rd and 6th give it a warm, open quality central to Ethiopian classical and popular music.",
    culturalContext:
      "The word Tizita means memory or longing in Amharic — often compared to the Portuguese saudade, a bittersweet ache for something distant or lost. While its intervals resemble the Western major pentatonic, Tizita is defined by how it is played: through ornamentation, breath-like phrasing, and the emotional weight placed on each note.",
    notableArtists: [
      "Mahmoud Ahmed",
      "Bezawork Asfaw",
      "Aster Aweke",
      "Mulatu Astatke",
      "Teddy Afro",
      "Meklit Hadero",
    ],
  },
  "tizita-minor": {
    name: "Tizita Minor",
    category: "tizita",
    variant: "minor",
    color: "#3b82f6", // blue
    intervals: "Root — Maj 2nd — Min 3rd — Perf 5th — Min 6th",
    degrees: [
      { interval: "Root", label: "ROOT", semitones: 0 },
      { interval: "Maj 2nd", label: "MAJ 2ND", semitones: 2 },
      { interval: "Min 3rd", label: "MIN 3RD", semitones: 3 },
      { interval: "Perf 5th", label: "PERF 5TH", semitones: 7 },
      { interval: "Min 6th", label: "MIN 6TH", semitones: 8 },
    ],
    description:
      "Tizita Minor carries the deeper weight of longing — a more somber, introspective color than its major counterpart. The flattened 3rd and 6th create a haunting, melancholic beauty.",
    culturalContext:
      "This variant of Tizita is often used for songs of loss, separation, and profound emotion. It shares the ornamental traditions of the major mode but turns inward, expressing grief and deep reflection through music.",
    notableArtists: [
      "Tilahun Gessesse",
      "Kassa Tessema",
      "Alemayehu Eshete",
      "Girma Beyene",
      "Hailu Mergia",
    ],
  },
  "bati-major": {
    name: "Bati Major",
    category: "bati",
    variant: "major",
    color: "#a855f7", // purple
    intervals: "Root — Maj 3rd — Perf 4th — Perf 5th — Min 6th",
    degrees: [
      { interval: "Root", label: "ROOT", semitones: 0 },
      { interval: "Maj 3rd", label: "MAJ 3RD", semitones: 4 },
      { interval: "Perf 4th", label: "PERF 4TH", semitones: 5 },
      { interval: "Perf 5th", label: "PERF 5TH", semitones: 7 },
      { interval: "Min 6th", label: "MIN 6TH", semitones: 8 },
    ],
    description:
      "Bati Major has a bold, triumphant character with its strong major 3rd leap from the root. The close clustering of the 4th, 5th, and minor 6th creates dramatic tension and release.",
    culturalContext:
      "Named after the town of Bati in the Amhara region, known for its famous market and cultural crossroads. Bati scales are associated with the Wollo region and carry a distinctly powerful, celebratory energy.",
    notableArtists: [
      "Mahmoud Ahmed",
      "Ali Birra",
      "Neway Debebe",
      "Ephrem Tamiru",
    ],
  },
  "bati-minor": {
    name: "Bati Minor",
    category: "bati",
    variant: "minor",
    color: "#22c55e", // green
    intervals: "Root — Min 3rd — Perf 4th — Perf 5th — Min 7th",
    degrees: [
      { interval: "Root", label: "ROOT", semitones: 0 },
      { interval: "Min 3rd", label: "MIN 3RD", semitones: 3 },
      { interval: "Perf 4th", label: "PERF 4TH", semitones: 5 },
      { interval: "Perf 5th", label: "PERF 5TH", semitones: 7 },
      { interval: "Min 7th", label: "MIN 7TH", semitones: 10 },
    ],
    description:
      "Bati Minor shares the structural power of its major counterpart but with a darker, more mysterious quality. The minor 3rd and 7th give it a bluesy, introspective character.",
    culturalContext:
      "This scale bridges Ethiopian and African-American musical traditions, sharing similarities with blues and minor pentatonic scales. It's often used in more contemporary Ethiopian music and jazz fusion.",
    notableArtists: [
      "Mulatu Astatke",
      "Getatchew Mekurya",
      "Hailu Mergia",
      "Emahoy Tsegué-Maryam Guèbrou",
    ],
  },
  "ambassel-major": {
    name: "Ambassel Major",
    category: "ambassel",
    variant: "major",
    color: "#eab308", // yellow
    intervals: "Root — Maj 2nd — Perf 4th — Perf 5th — Maj 6th",
    degrees: [
      { interval: "Root", label: "ROOT", semitones: 0 },
      { interval: "Maj 2nd", label: "MAJ 2ND", semitones: 2 },
      { interval: "Perf 4th", label: "PERF 4TH", semitones: 5 },
      { interval: "Perf 5th", label: "PERF 5TH", semitones: 7 },
      { interval: "Maj 6th", label: "MAJ 6TH", semitones: 9 },
    ],
    description:
      "Ambassel Major has an open, suspended quality — neither fully major nor minor due to the absence of the 3rd. This ambiguity gives it a floating, spiritual character.",
    culturalContext:
      "Named after Ambassel, a mountainous region in the Wollo zone. This scale is deeply connected to Ethiopian Orthodox church music and spiritual traditions. Its suspended quality evokes contemplation and prayer.",
    notableArtists: [
      "Tilahun Gessesse",
      "Aster Aweke",
      "Gigi",
      "Ejigayehu Shibabaw",
    ],
  },
  "ambassel-minor": {
    name: "Ambassel Minor",
    category: "ambassel",
    variant: "minor",
    color: "#f97316", // orange
    intervals: "Root — Min 2nd — Perf 4th — Perf 5th — Min 6th",
    degrees: [
      { interval: "Root", label: "ROOT", semitones: 0 },
      { interval: "Min 2nd", label: "MIN 2ND", semitones: 1 },
      { interval: "Perf 4th", label: "PERF 4TH", semitones: 5 },
      { interval: "Perf 5th", label: "PERF 5TH", semitones: 7 },
      { interval: "Min 6th", label: "MIN 6TH", semitones: 8 },
    ],
    description:
      "Ambassel Minor creates an intensely dramatic, almost exotic sound with its minor 2nd. The half-step from root creates immediate tension and a distinctly Middle Eastern flavor.",
    culturalContext:
      "This variant reflects the historical connections between Ethiopian music and Middle Eastern traditions, particularly through religious and trade routes. It's often used for deeply emotional or dramatic musical moments.",
    notableArtists: [
      "Mahmoud Ahmed",
      "Getatchew Mekurya",
      "Bahta Gebreheywet",
    ],
  },
  anchihoye: {
    name: "Anchihoye",
    category: "anchihoye",
    variant: null,
    color: "#06b6d4", // cyan
    intervals: "Root — Min 2nd — Perf 4th — Aug 4th — Maj 6th",
    degrees: [
      { interval: "Root", label: "ROOT", semitones: 0 },
      { interval: "Min 2nd", label: "MIN 2ND", semitones: 1 },
      { interval: "Perf 4th", label: "PERF 4TH", semitones: 5 },
      { interval: "Aug 4th", label: "AUG 4TH", semitones: 6 },
      { interval: "Maj 6th", label: "MAJ 6TH", semitones: 9 },
    ],
    description:
      "Anchihoye is the most distinctive and enigmatic of the Kiñit scales. Its augmented 4th (tritone) creates an otherworldly, almost mystical quality unique in Ethiopian music.",
    culturalContext:
      'The name "Anchihoye" is a call to a loved one, an intimate beckoning. This scale is associated with deeply personal expression and spiritual transcendence. Its unusual intervals set it apart from both Western and other Ethiopian scales.',
    notableArtists: [
      "Mulatu Astatke",
      "Emahoy Tsegué-Maryam Guèbrou",
      "Hailu Mergia",
    ],
  },
};

export const ROOT_NOTES: RootNote[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const NATURAL_NOTES: RootNote[] = ["C", "D", "E", "F", "G", "A", "B"];
export const SHARP_NOTES: RootNote[] = ["C#", "D#", "F#", "G#", "A#"];

// Which natural notes have a sharp available (for UI layout)
export const NOTES_WITH_SHARPS: RootNote[] = ["C", "D", "F", "G", "A"];

// Note name normalization (handle enharmonic equivalents)
function normalizeNote(note: string): string {
  const enharmonics: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Fb: "E",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
    Cb: "B",
    "E#": "F",
    "B#": "C",
  };
  return enharmonics[note] || note;
}

// All scales data
const SCALES_DATA: Record<ScaleType, Record<RootNote, string[]>> = {
  "tizita-major": {
    C: ["C", "D", "E", "G", "A"],
    D: ["D", "E", "F#", "A", "B"],
    E: ["E", "F#", "G#", "B", "C#"],
    F: ["F", "G", "A", "C", "D"],
    G: ["G", "A", "B", "D", "E"],
    A: ["A", "B", "C#", "E", "F#"],
    B: ["B", "C#", "D#", "F#", "G#"],
    "C#": ["C#", "D#", "F", "G#", "A#"],
    "D#": ["D#", "F", "G", "A#", "C"],
    "F#": ["F#", "G#", "A#", "C#", "D#"],
    "G#": ["G#", "A#", "C", "D#", "F"],
    "A#": ["A#", "C", "D", "F", "G"],
  },
  "tizita-minor": {
    C: ["C", "D", "D#", "G", "G#"],
    D: ["D", "E", "F", "A", "A#"],
    E: ["E", "F#", "G", "B", "C"],
    F: ["F", "G", "G#", "C", "C#"],
    G: ["G", "A", "A#", "D", "D#"],
    A: ["A", "B", "C", "E", "F"],
    B: ["B", "C#", "D", "F#", "G"],
    "C#": ["C#", "D#", "E", "G#", "A"],
    "D#": ["D#", "F", "F#", "A#", "B"],
    "F#": ["F#", "G#", "A", "C#", "D"],
    "G#": ["G#", "A#", "B", "D#", "E"],
    "A#": ["A#", "C", "C#", "F", "F#"],
  },
  "bati-major": {
    C: ["C", "E", "F", "G", "G#"],
    D: ["D", "F#", "G", "A", "A#"],
    E: ["E", "G#", "A", "B", "C"],
    F: ["F", "A", "A#", "C", "C#"],
    G: ["G", "B", "C", "D", "D#"],
    A: ["A", "C#", "D", "E", "F"],
    B: ["B", "D#", "E", "F#", "G"],
    "C#": ["C#", "F", "F#", "G#", "A"],
    "D#": ["D#", "G", "G#", "A#", "B"],
    "F#": ["F#", "A#", "B", "C#", "D"],
    "G#": ["G#", "C", "C#", "D#", "E"],
    "A#": ["A#", "D", "D#", "F", "F#"],
  },
  "bati-minor": {
    C: ["C", "D#", "F", "G", "A#"],
    D: ["D", "F", "G", "A", "C"],
    E: ["E", "G", "A", "B", "D"],
    F: ["F", "G#", "A#", "C", "D#"],
    G: ["G", "A#", "C", "D", "F"],
    A: ["A", "C", "D", "E", "G"],
    B: ["B", "D", "E", "F#", "A"],
    "C#": ["C#", "E", "F#", "G#", "B"],
    "D#": ["D#", "F#", "G#", "A#", "C#"],
    "F#": ["F#", "A", "B", "C#", "E"],
    "G#": ["G#", "B", "C#", "D#", "F#"],
    "A#": ["A#", "C#", "D#", "F", "G#"],
  },
  "ambassel-major": {
    C: ["C", "D", "F", "G", "A"],
    D: ["D", "E", "G", "A", "B"],
    E: ["E", "F#", "A", "B", "C#"],
    F: ["F", "G", "A#", "C", "D"],
    G: ["G", "A", "C", "D", "E"],
    A: ["A", "B", "D", "E", "F#"],
    B: ["B", "C#", "E", "F#", "G#"],
    "C#": ["C#", "D#", "F#", "G#", "A#"],
    "D#": ["D#", "F", "G#", "A#", "C"],
    "F#": ["F#", "G#", "B", "C#", "D#"],
    "G#": ["G#", "A#", "C#", "D#", "F"],
    "A#": ["A#", "C", "D#", "F", "G"],
  },
  "ambassel-minor": {
    C: ["C", "C#", "F", "G", "G#"],
    D: ["D", "D#", "G", "A", "A#"],
    E: ["E", "F", "A", "B", "C"],
    F: ["F", "F#", "A#", "C", "C#"],
    G: ["G", "G#", "C", "D", "D#"],
    A: ["A", "A#", "D", "E", "F"],
    B: ["B", "C", "E", "F#", "G"],
    "C#": ["C#", "D", "F#", "G#", "A"],
    "D#": ["D#", "E", "G#", "A#", "C"],
    "F#": ["F#", "G", "B", "C#", "D"],
    "G#": ["G#", "A", "C#", "D#", "E"],
    "A#": ["A#", "B", "D#", "F", "F#"],
  },
  anchihoye: {
    C: ["C", "C#", "F", "F#", "A"],
    D: ["D", "D#", "G", "G#", "B"],
    E: ["E", "F", "A", "A#", "C#"],
    F: ["F", "F#", "A#", "B", "D"],
    G: ["G", "G#", "C", "C#", "E"],
    A: ["A", "A#", "D", "D#", "F#"],
    B: ["B", "C", "E", "F", "G#"],
    "C#": ["C#", "D", "F#", "G", "A#"],
    "D#": ["D#", "E", "G#", "A", "C"],
    "F#": ["F#", "G", "B", "C", "D#"],
    "G#": ["G#", "A", "C#", "D", "F"],
    "A#": ["A#", "B", "D#", "E", "G"],
  },
};

/**
 * Get the scale type from category and variant
 */
export function getScaleType(
  category: ScaleCategory,
  variant: ScaleVariant | null
): ScaleType {
  if (category === "anchihoye") return "anchihoye";
  return `${category}-${variant}` as ScaleType;
}

/**
 * Check if a category has major/minor variants
 */
export function hasVariants(category: ScaleCategory): boolean {
  return category !== "anchihoye";
}

/**
 * Get the notes in a scale for a given root
 */
export function getScaleNotes(
  scaleType: ScaleType,
  root: RootNote
): string[] {
  return SCALES_DATA[scaleType][root].map(normalizeNote);
}

/**
 * Get scale notes with their degree labels
 */
export function getScaleNotesWithDegrees(
  scaleType: ScaleType,
  root: RootNote
): { note: string; degree: ScaleDegree }[] {
  const notes = getScaleNotes(scaleType, root);
  const degrees = SCALE_INFO[scaleType].degrees;
  return notes.map((note, i) => ({ note, degree: degrees[i] }));
}

/**
 * Check if a note name (like "C", "C#", "D") is in the scale
 */
export function isNoteInScale(
  noteName: string,
  scaleType: ScaleType,
  root: RootNote
): boolean {
  const normalizedNote = normalizeNote(noteName);
  const scaleNotes = getScaleNotes(scaleType, root);
  return scaleNotes.includes(normalizedNote);
}

/**
 * Get note name from MIDI note number
 */
export function midiToNoteName(midi: number): string {
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  return noteNames[midi % 12];
}

/**
 * Get MIDI note number from note name and octave
 */
export function noteNameToMidi(noteName: RootNote, octave: number): number {
  const noteIndex = ROOT_NOTES.indexOf(noteName);
  return noteIndex + (octave + 1) * 12;
}

/**
 * Check if a MIDI note number is in the scale
 */
export function isMidiNoteInScale(
  midi: number,
  scaleType: ScaleType,
  root: RootNote
): boolean {
  const noteName = midiToNoteName(midi);
  return isNoteInScale(noteName, scaleType, root);
}

/**
 * Check if a note is the root of the scale
 */
export function isRootNote(noteName: string, root: RootNote): boolean {
  return normalizeNote(noteName) === normalizeNote(root);
}

/**
 * Check if a MIDI note is the root of the scale
 */
export function isMidiRootNote(midi: number, root: RootNote): boolean {
  const noteName = midiToNoteName(midi);
  return isRootNote(noteName, root);
}

/**
 * Get MIDI notes for a scale starting from a given octave
 */
export function getScaleMidiNotes(
  scaleType: ScaleType,
  root: RootNote,
  startOctave: number = 4
): number[] {
  const rootMidi = noteNameToMidi(root, startOctave);
  const degrees = SCALE_INFO[scaleType].degrees;
  return degrees.map((d) => rootMidi + d.semitones);
}
