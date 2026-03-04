"use client";

import { useState } from "react";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const [isKeyboardCollapsed, setIsKeyboardCollapsed] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      {/* Scrollable Content Area */}
      <ScrollArea 
        className={isKeyboardCollapsed ? "h-[calc(100vh-48px)]" : "h-[calc(100vh-260px)]"}
      >
        <main className="flex min-h-full flex-col items-center justify-start p-8">
          <div className="w-full max-w-4xl">
            <h1 className="mb-2 text-center text-3xl font-bold text-foreground">
              Ethiopian Scale Learning Platform
            </h1>
            <p className="mb-8 text-center text-muted-foreground">
              Learn and practice Ethiopian scales with MIDI or keyboard input
            </p>

            {/* Placeholder for future content */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-8">
                <h2 className="text-xl font-semibold mb-4">Welcome</h2>
                <p className="text-muted-foreground">
                  This platform will help you learn Ethiopian scales. 
                  Use the piano keyboard docked at the bottom to practice.
                </p>
                <p className="text-muted-foreground mt-2">
                  You can play using your computer keyboard (keys shown on piano keys), 
                  click with your mouse, or connect a MIDI device.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-8">
                <h2 className="text-xl font-semibold mb-4">Coming Soon</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Ethiopian scale lessons</li>
                  <li>• Interactive exercises</li>
                  <li>• Progress tracking</li>
                  <li>• Audio playback and recording</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </ScrollArea>

      {/* Fixed Piano Keyboard Dock */}
      <PianoKeyboard onCollapseChange={setIsKeyboardCollapsed} />
    </div>
  );
}
