"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  ScaleType,
  RootNote,
  ROOT_NOTES,
  SCALE_INFO,
  getScaleMidiNotes,
  getScaleNotes,
  midiToNoteName,
} from "@/lib/scales";

// Quiz Types
type QuizMode = "scale-id" | "note-membership";
type QuizState = "menu" | "playing" | "feedback" | "results";
type Difficulty = 1 | 2 | 3 | 4; // Unlocks more scales progressively

interface QuizQuestion {
  mode: QuizMode;
  correctAnswer: string;
  options: string[];
  scaleType?: ScaleType;
  root?: RootNote;
  targetNote?: string;
}

interface QuizProps {
  onPlayNote?: (midi: number) => void;
  onStopNote?: (midi: number) => void;
}

// Difficulty progression: which scales are available at each level
const DIFFICULTY_SCALES: Record<Difficulty, ScaleType[]> = {
  1: ["tizita-major", "tizita-minor"],
  2: ["tizita-major", "tizita-minor", "bati-major", "bati-minor"],
  3: ["tizita-major", "tizita-minor", "bati-major", "bati-minor", "ambassel-major", "ambassel-minor"],
  4: ["tizita-major", "tizita-minor", "bati-major", "bati-minor", "ambassel-major", "ambassel-minor", "anchihoye"],
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
  4: "Master",
};

const QUESTIONS_PER_ROUND = 10;

// LCD Screen Component
function LCDScreen({
  children,
  className,
  accentColor = "#f59e0b",
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "rounded-[4px]",
        "bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950",
        "p-[3px]",
        "shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        className
      )}
    >
      <div className="rounded-[2px] bg-gradient-to-b from-zinc-950 to-zinc-900 p-[2px]">
        <div
          className="relative rounded-[1px] p-4"
          style={{
            background: `linear-gradient(145deg, ${accentColor}08, ${accentColor}15, ${accentColor}05)`,
            boxShadow: `
              inset 0 0 60px rgba(0,0,0,0.3),
              inset 0 1px 0 rgba(255,255,255,0.03),
              inset 0 -1px 0 rgba(0,0,0,0.5)
            `,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-[1px]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.3) 2px,
                rgba(0,0,0,0.3) 4px
              )`,
            }}
          />
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

// MPC-style Button
function MPCButton({
  children,
  onClick,
  color = "#f59e0b",
  selected = false,
  correct,
  disabled = false,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  selected?: boolean;
  correct?: boolean | null;
  disabled?: boolean;
  className?: string;
}) {
  const isCorrect = correct === true;
  const isWrong = correct === false;
  const showState = correct !== undefined && correct !== null;

  let bgColor = color;
  if (showState) {
    bgColor = isCorrect ? "#22c55e" : isWrong ? "#ef4444" : color;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative px-4 py-3 rounded-[3px] transition-all font-mono text-sm",
        !disabled && "hover:translate-y-[1px] active:translate-y-[2px]",
        disabled && "cursor-not-allowed opacity-70",
        selected && "translate-y-[2px]",
        className
      )}
      style={{
        background: selected || showState
          ? `linear-gradient(180deg, ${bgColor}90 0%, ${bgColor}70 100%)`
          : `linear-gradient(180deg, ${bgColor}50 0%, ${bgColor}35 50%, ${bgColor}30 100%)`,
        border: `1px solid ${selected || showState ? bgColor : `${bgColor}60`}`,
        boxShadow: selected
          ? `
              inset 0 1px 0 ${bgColor}aa,
              inset 0 -1px 2px rgba(0,0,0,0.4),
              0 1px 2px rgba(0,0,0,0.5)
            `
          : `
              inset 0 1px 0 ${bgColor}40,
              inset 0 -1px 2px rgba(0,0,0,0.3),
              0 2px 4px rgba(0,0,0,0.4),
              0 3px 6px rgba(0,0,0,0.2)
            `,
        color: selected || showState ? "#fff" : bgColor,
        textShadow: selected || showState ? `0 0 8px ${bgColor}` : "none",
      }}
    >
      {children}
    </button>
  );
}

// Progress Bar
function ProgressBar({
  current,
  total,
  color = "#f59e0b",
}: {
  current: number;
  total: number;
  color?: string;
}) {
  const percentage = (current / total) * 100;
  return (
    <div className="relative h-2 rounded-full bg-zinc-800 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
        style={{
          width: `${percentage}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          boxShadow: `0 0 8px ${color}60`,
        }}
      />
    </div>
  );
}

// Stats Display
function StatDisplay({
  label,
  value,
  color = "#f59e0b",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider opacity-50 font-mono" style={{ color }}>
        {label}
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function Quiz({ onPlayNote, onStopNote }: QuizProps) {
  const [state, setState] = useState<QuizState>("menu");
  const [mode, setMode] = useState<QuizMode>("scale-id");
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [unlockedDifficulty, setUnlockedDifficulty] = useState<Difficulty>(1);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const isPlayingRef = useRef(false);
  const accentColor = "#f59e0b"; // Amber for quiz

  // Generate a random question
  const generateQuestion = useCallback((): QuizQuestion => {
    const availableScales = DIFFICULTY_SCALES[difficulty];
    const randomScale = availableScales[Math.floor(Math.random() * availableScales.length)];
    const randomRoot = ROOT_NOTES[Math.floor(Math.random() * ROOT_NOTES.length)];

    if (mode === "scale-id") {
      // Scale Identification: Play a scale, identify which one it is
      const options = shuffleArray([...availableScales]).slice(0, 4);
      if (!options.includes(randomScale)) {
        options[0] = randomScale;
      }
      
      return {
        mode: "scale-id",
        correctAnswer: randomScale,
        options: shuffleArray(options),
        scaleType: randomScale,
        root: randomRoot,
      };
    } else {
      // Note Membership: Given a scale and root, which note belongs?
      const scaleNotes = getScaleNotes(randomScale, randomRoot);
      const allNotes = ROOT_NOTES as readonly string[];
      const notInScale = allNotes.filter(n => !scaleNotes.includes(n));
      
      // 50% chance: "which note IS in the scale" vs "which note is NOT in the scale"
      const askForInScale = Math.random() > 0.5;
      
      if (askForInScale) {
        // Pick a correct note and 3 wrong notes
        const correctNote = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
        const wrongNotes = shuffleArray([...notInScale]).slice(0, 3);
        const options = shuffleArray([correctNote, ...wrongNotes]);
        
        return {
          mode: "note-membership",
          correctAnswer: correctNote,
          options,
          scaleType: randomScale,
          root: randomRoot,
          targetNote: "in",
        };
      } else {
        // Pick a wrong note and 3 correct notes
        const wrongNote = notInScale[Math.floor(Math.random() * notInScale.length)];
        const correctNotes = shuffleArray([...scaleNotes]).slice(0, 3);
        const options = shuffleArray([wrongNote, ...correctNotes]);
        
        return {
          mode: "note-membership",
          correctAnswer: wrongNote,
          options,
          scaleType: randomScale,
          root: randomRoot,
          targetNote: "out",
        };
      }
    }
  }, [mode, difficulty]);

  // Play the scale for scale-id questions
  const playScaleForQuestion = useCallback(async () => {
    if (!currentQuestion || !onPlayNote || !onStopNote || isPlayingRef.current) return;
    if (currentQuestion.mode !== "scale-id") return;

    isPlayingRef.current = true;
    const midiNotes = getScaleMidiNotes(currentQuestion.scaleType!, currentQuestion.root!, 4);
    const notesToPlay = [...midiNotes, midiNotes[0] + 12]; // Add octave

    for (const note of notesToPlay) {
      if (!isPlayingRef.current) break;
      onPlayNote(note);
      await new Promise((resolve) => setTimeout(resolve, 280));
      onStopNote(note);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    isPlayingRef.current = false;
  }, [currentQuestion, onPlayNote, onStopNote]);

  // Start a new round
  const startRound = useCallback(() => {
    setScore(0);
    setQuestionNumber(0);
    setStreak(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    const q = generateQuestion();
    setCurrentQuestion(q);
    setState("playing");
  }, [generateQuestion]);

  // Handle answer selection
  const handleAnswer = useCallback((answer: string) => {
    if (state !== "playing" || selectedAnswer) return;

    setSelectedAnswer(answer);
    const correct = answer === currentQuestion?.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const newStreak = s + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
    } else {
      setStreak(0);
    }

    setState("feedback");
  }, [state, selectedAnswer, currentQuestion, bestStreak]);

  // Move to next question or results
  const nextQuestion = useCallback(() => {
    const nextNum = questionNumber + 1;

    if (nextNum >= QUESTIONS_PER_ROUND) {
      // Round complete
      const finalScore = score + (isCorrect ? 0 : 0); // Score already updated
      // Unlock next difficulty if scored 80%+
      if (finalScore >= 8 && difficulty < 4 && difficulty === unlockedDifficulty) {
        setUnlockedDifficulty((d) => Math.min(4, d + 1) as Difficulty);
      }
      setState("results");
    } else {
      setQuestionNumber(nextNum);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setCurrentQuestion(generateQuestion());
      setState("playing");
    }
  }, [questionNumber, score, isCorrect, difficulty, unlockedDifficulty, generateQuestion]);

  // Auto-play scale when question changes (for scale-id mode)
  useEffect(() => {
    if (state === "playing" && currentQuestion?.mode === "scale-id") {
      const timer = setTimeout(() => {
        playScaleForQuestion();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, currentQuestion, playScaleForQuestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
    };
  }, []);

  // Menu Screen
  if (state === "menu") {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <LCDScreen accentColor={accentColor}>
          <div className="text-center mb-6">
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-60 font-mono" style={{ color: accentColor }}>
              Training Mode
            </div>
            <h2 className="text-2xl font-bold tracking-wide" style={{ color: accentColor }}>
              Scale Quiz
            </h2>
          </div>

          {/* Mode Selection */}
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-wider mb-2 opacity-50 font-mono" style={{ color: accentColor }}>
              Quiz Type
            </div>
            <div className="flex gap-2">
              <MPCButton
                onClick={() => setMode("scale-id")}
                selected={mode === "scale-id"}
                color={accentColor}
                className="flex-1"
              >
                <div className="text-xs">Scale ID</div>
                <div className="text-[9px] opacity-60">Hear & identify</div>
              </MPCButton>
              <MPCButton
                onClick={() => setMode("note-membership")}
                selected={mode === "note-membership"}
                color={accentColor}
                className="flex-1"
              >
                <div className="text-xs">Note Quiz</div>
                <div className="text-[9px] opacity-60">Find the note</div>
              </MPCButton>
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-wider mb-2 opacity-50 font-mono" style={{ color: accentColor }}>
              Difficulty
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as Difficulty[]).map((d) => {
                const isLocked = d > unlockedDifficulty;
                const scaleCount = DIFFICULTY_SCALES[d].length;
                return (
                  <MPCButton
                    key={d}
                    onClick={() => !isLocked && setDifficulty(d)}
                    selected={difficulty === d}
                    disabled={isLocked}
                    color={isLocked ? "#666" : accentColor}
                    className="py-2"
                  >
                    <div className="text-xs">{isLocked ? "🔒" : DIFFICULTY_LABELS[d]}</div>
                    <div className="text-[9px] opacity-60">{scaleCount} scales</div>
                  </MPCButton>
                );
              })}
            </div>
          </div>

          {/* Start Button */}
          <MPCButton
            onClick={startRound}
            color={accentColor}
            selected
            className="w-full py-4"
          >
            <div className="text-lg font-bold">Start Quiz</div>
            <div className="text-xs opacity-70">{QUESTIONS_PER_ROUND} questions</div>
          </MPCButton>

          {/* Best streak */}
          {bestStreak > 0 && (
            <div className="text-center mt-4 text-xs opacity-50 font-mono" style={{ color: accentColor }}>
              Best Streak: {bestStreak}
            </div>
          )}
        </LCDScreen>
      </div>
    );
  }

  // Playing / Feedback Screen
  if (state === "playing" || state === "feedback") {
    const scaleInfo = currentQuestion?.scaleType ? SCALE_INFO[currentQuestion.scaleType] : null;

    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Progress & Stats */}
        <LCDScreen accentColor={accentColor} className="py-0">
          <div className="flex items-center gap-4 mb-3">
            <StatDisplay label="Question" value={`${questionNumber + 1}/${QUESTIONS_PER_ROUND}`} color={accentColor} />
            <div className="flex-1">
              <ProgressBar current={questionNumber + 1} total={QUESTIONS_PER_ROUND} color={accentColor} />
            </div>
            <StatDisplay label="Score" value={score} color={accentColor} />
            <StatDisplay label="Streak" value={streak} color={streak >= 3 ? "#22c55e" : accentColor} />
          </div>
        </LCDScreen>

        {/* Question */}
        <LCDScreen accentColor={accentColor}>
          <div className="text-center mb-6">
            {currentQuestion?.mode === "scale-id" ? (
              <>
                <div className="text-[10px] uppercase tracking-[0.2em] mb-2 opacity-60 font-mono" style={{ color: accentColor }}>
                  Listen & Identify
                </div>
                <h3 className="text-lg font-bold mb-4" style={{ color: accentColor }}>
                  Which scale is this?
                </h3>
                <MPCButton
                  onClick={playScaleForQuestion}
                  color={accentColor}
                  className="mb-4"
                >
                  ▶ Play Again
                </MPCButton>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-[0.2em] mb-2 opacity-60 font-mono" style={{ color: accentColor }}>
                  {currentQuestion?.root} {scaleInfo?.name}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: accentColor }}>
                  {currentQuestion?.targetNote === "in"
                    ? "Which note IS in this scale?"
                    : "Which note is NOT in this scale?"}
                </h3>
                <div className="text-xs opacity-50 font-mono" style={{ color: accentColor }}>
                  {scaleInfo?.intervals}
                </div>
              </>
            )}
          </div>

          {/* Answer Options */}
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion?.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = option === currentQuestion.correctAnswer;
              let correctState: boolean | null = null;

              if (state === "feedback") {
                if (isCorrectAnswer) correctState = true;
                else if (isSelected) correctState = false;
              }

              const displayName = currentQuestion.mode === "scale-id"
                ? SCALE_INFO[option as ScaleType]?.name || option
                : option;

              return (
                <MPCButton
                  key={option}
                  onClick={() => handleAnswer(option)}
                  color={accentColor}
                  selected={isSelected && state === "playing"}
                  correct={correctState}
                  disabled={state === "feedback"}
                  className="py-4"
                >
                  {displayName}
                </MPCButton>
              );
            })}
          </div>

          {/* Feedback */}
          {state === "feedback" && (
            <div className="mt-6 text-center">
              <div
                className="text-lg font-bold mb-2"
                style={{ color: isCorrect ? "#22c55e" : "#ef4444" }}
              >
                {isCorrect ? "Correct!" : "Incorrect"}
              </div>
              {!isCorrect && currentQuestion?.mode === "scale-id" && (
                <div className="text-sm opacity-70" style={{ color: accentColor }}>
                  It was {SCALE_INFO[currentQuestion.correctAnswer as ScaleType]?.name}
                </div>
              )}
              {!isCorrect && currentQuestion?.mode === "note-membership" && (
                <div className="text-sm opacity-70" style={{ color: accentColor }}>
                  The answer was {currentQuestion.correctAnswer}
                </div>
              )}
              <MPCButton
                onClick={nextQuestion}
                color={accentColor}
                selected
                className="mt-4"
              >
                {questionNumber + 1 >= QUESTIONS_PER_ROUND ? "See Results" : "Next Question"}
              </MPCButton>
            </div>
          )}
        </LCDScreen>
      </div>
    );
  }

  // Results Screen
  if (state === "results") {
    const percentage = Math.round((score / QUESTIONS_PER_ROUND) * 100);
    const passed = percentage >= 80;
    const unlockedNew = passed && difficulty < 4 && difficulty === unlockedDifficulty - 1;

    let message = "";
    if (percentage === 100) message = "Perfect!";
    else if (percentage >= 80) message = "Excellent!";
    else if (percentage >= 60) message = "Good job!";
    else if (percentage >= 40) message = "Keep practicing!";
    else message = "Try again!";

    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <LCDScreen accentColor={accentColor}>
          <div className="text-center py-4">
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-60 font-mono" style={{ color: accentColor }}>
              Round Complete
            </div>
            <h2 className="text-3xl font-bold mb-6" style={{ color: accentColor }}>
              {message}
            </h2>

            <div className="flex justify-center gap-8 mb-6">
              <StatDisplay label="Score" value={`${score}/${QUESTIONS_PER_ROUND}`} color={accentColor} />
              <StatDisplay label="Accuracy" value={`${percentage}%`} color={percentage >= 80 ? "#22c55e" : accentColor} />
              <StatDisplay label="Best Streak" value={bestStreak} color={bestStreak >= 5 ? "#22c55e" : accentColor} />
            </div>

            {unlockedNew && (
              <div
                className="mb-6 py-3 px-4 rounded-lg text-center"
                style={{
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                }}
              >
                <div className="text-sm font-bold" style={{ color: "#22c55e" }}>
                  🎉 New Difficulty Unlocked!
                </div>
                <div className="text-xs opacity-70" style={{ color: accentColor }}>
                  {DIFFICULTY_LABELS[unlockedDifficulty]} mode is now available
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <MPCButton onClick={startRound} color={accentColor} selected className="px-6">
                Play Again
              </MPCButton>
              <MPCButton onClick={() => setState("menu")} color={accentColor} className="px-6">
                Menu
              </MPCButton>
            </div>
          </div>
        </LCDScreen>
      </div>
    );
  }

  return null;
}

// Utility: Shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
